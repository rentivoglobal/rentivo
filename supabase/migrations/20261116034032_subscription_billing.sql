-- Subscription billing, plan entitlements, and usage accounting.
-- Existing one-time payments remain valid and continue to unlock their contacts.

CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('renter', 'lister')),
  amount_kobo BIGINT NOT NULL DEFAULT 0 CHECK (amount_kobo >= 0),
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly', 'annual')),
  paystack_plan_code TEXT,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  audience TEXT NOT NULL CHECK (audience IN ('renter', 'lister')),
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_customer_code TEXT,
  provider_subscription_code TEXT UNIQUE,
  provider_email_token TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'non-renewing', 'cancelled', 'attention', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  grace_until TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_one_current_subscription_per_audience
  ON public.subscriptions (user_id, audience)
  WHERE status IN ('pending', 'active', 'non-renewing', 'attention');

CREATE TABLE public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'paystack',
  provider_reference TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo >= 0),
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  channel TEXT,
  paid_at TIMESTAMPTZ,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.usage_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  renter_unlocks_used INTEGER NOT NULL DEFAULT 0 CHECK (renter_unlocks_used >= 0),
  lister_leads_used INTEGER NOT NULL DEFAULT 0 CHECK (lister_leads_used >= 0),
  active_listings_count INTEGER NOT NULL DEFAULT 0 CHECK (active_listings_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_start, period_end)
);

CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usage_period_id UUID NOT NULL REFERENCES public.usage_periods(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('renter_unlock', 'lister_lead')),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_type, reference_id)
);

CREATE INDEX idx_subscriptions_user_status ON public.subscriptions (user_id, status);
CREATE INDEX idx_usage_periods_user_window ON public.usage_periods (user_id, period_start, period_end);
CREATE INDEX idx_billing_transactions_user ON public.billing_transactions (user_id, created_at DESC);

INSERT INTO public.subscription_plans
  (code, name, audience, amount_kobo, entitlements, is_free, sort_order)
VALUES
  ('renter_free', 'Free Explorer', 'renter', 0,
    '{"renter_contact_unlocks": 3, "saved_listing_limit": 20, "priority_support": false}'::jsonb, TRUE, 10),
  ('renter_plus', 'Renter Plus', 'renter', 250000,
    '{"renter_contact_unlocks": 15, "saved_listing_limit": null, "priority_support": true, "advanced_matching": true}'::jsonb, FALSE, 20),
  ('renter_pro', 'Renter Pro', 'renter', 500000,
    '{"renter_contact_unlocks": 40, "saved_listing_limit": null, "priority_support": true, "advanced_matching": true, "priority_availability": true}'::jsonb, FALSE, 30),
  ('lister_free', 'Lister Free', 'lister', 0,
    '{"active_listing_limit": 1, "monthly_lead_limit": 5}'::jsonb, TRUE, 10),
  ('lister_starter', 'Lister Starter', 'lister', 300000,
    '{"active_listing_limit": 10, "monthly_lead_limit": 40}'::jsonb, FALSE, 20),
  ('lister_growth', 'Lister Growth', 'lister', 750000,
    '{"active_listing_limit": 40, "monthly_lead_limit": 150}'::jsonb, FALSE, 30),
  ('lister_pro', 'Lister Pro', 'lister', 1500000,
    '{"active_listing_limit": 100, "monthly_lead_limit": null, "priority_moderation": true}'::jsonb, FALSE, 40)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  amount_kobo = EXCLUDED.amount_kobo,
  entitlements = EXCLUDED.entitlements,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.get_current_entitlements(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
  v_audience TEXT;
  v_plan public.subscription_plans;
  v_subscription public.subscriptions;
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  v_audience := CASE
    WHEN v_role IN ('landlord', 'agent') THEN 'lister'
    ELSE 'renter'
  END;

  SELECT s.* INTO v_subscription
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = p_user_id
    AND p.audience = v_audience
    AND s.status IN ('active', 'non-renewing', 'attention')
    AND (s.current_period_end > NOW() OR s.grace_until > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  END IF;

  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE audience = v_audience AND is_free AND is_active
    ORDER BY sort_order
    LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'audience', v_audience,
    'planCode', v_plan.code,
    'planName', v_plan.name,
    'subscriptionId', v_subscription.id,
    'status', COALESCE(v_subscription.status, 'free'),
    'periodStart', v_subscription.current_period_start,
    'periodEnd', v_subscription.current_period_end,
    'graceUntil', v_subscription.grace_until,
    'entitlements', v_plan.entitlements
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_renter_unlock(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.availability_requests;
  v_user_id UUID := auth.uid();
  v_subscription public.subscriptions;
  v_plan public.subscription_plans;
  v_period public.usage_periods;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT * INTO v_request
  FROM public.availability_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL OR v_request.renter_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF v_request.status = 'paid' THEN
    RETURN jsonb_build_object('granted', TRUE, 'alreadyGranted', TRUE);
  END IF;
  IF v_request.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Contact access is only available after vacancy confirmation';
  END IF;

  SELECT s.* INTO v_subscription
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = v_user_id
    AND p.audience = 'renter'
    AND s.status IN ('active', 'non-renewing', 'attention')
    AND (s.current_period_end > NOW() OR s.grace_until > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  END IF;

  IF v_plan.id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans
    WHERE code = 'renter_free' AND is_active;
  END IF;

  v_limit := NULLIF(v_plan.entitlements ->> 'renter_contact_unlocks', '')::INTEGER;
  IF v_limit IS NULL THEN
    v_limit := 0;
  END IF;

  INSERT INTO public.usage_periods (
    user_id, subscription_id, plan_id, period_start, period_end
  )
  VALUES (
    v_user_id,
    v_subscription.id,
    v_plan.id,
    COALESCE(v_subscription.current_period_start, date_trunc('month', NOW())),
    COALESCE(v_subscription.current_period_end, date_trunc('month', NOW()) + INTERVAL '1 month')
  )
  ON CONFLICT (user_id, period_start, period_end) DO NOTHING;

  SELECT * INTO v_period
  FROM public.usage_periods
  WHERE user_id = v_user_id
    AND period_start = COALESCE(v_subscription.current_period_start, date_trunc('month', NOW()))
    AND period_end = COALESCE(v_subscription.current_period_end, date_trunc('month', NOW()) + INTERVAL '1 month')
  FOR UPDATE;

  v_used := v_period.renter_unlocks_used;
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Monthly contact unlock limit reached';
  END IF;

  INSERT INTO public.usage_events (usage_period_id, user_id, event_type, reference_id)
  VALUES (v_period.id, v_user_id, 'renter_unlock', p_request_id);

  UPDATE public.usage_periods
  SET renter_unlocks_used = renter_unlocks_used + 1, updated_at = NOW()
  WHERE id = v_period.id;

  UPDATE public.availability_requests
  SET status = 'paid', contact_unlocked_at = NOW(), updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'granted', TRUE,
    'alreadyGranted', FALSE,
    'planCode', v_plan.code,
    'remaining', v_limit - v_used - 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_usage_summary(p_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'entitlements', public.get_current_entitlements(p_user_id),
    'period', (
      SELECT to_jsonb(up)
      FROM public.usage_periods up
      WHERE up.user_id = p_user_id
        AND NOW() >= up.period_start
        AND NOW() < up.period_end
      ORDER BY up.period_start DESC
      LIMIT 1
    )
  );
$$;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plans_public_read" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "subscriptions_read_self_or_admin" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());
CREATE POLICY "billing_transactions_read_self_or_admin" ON public.billing_transactions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());
CREATE POLICY "usage_periods_read_self_or_admin" ON public.usage_periods
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());
CREATE POLICY "usage_events_read_self_or_admin" ON public.usage_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_admin());

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.subscriptions, public.billing_transactions, public.usage_periods, public.usage_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_entitlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_renter_unlock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID) TO authenticated;
