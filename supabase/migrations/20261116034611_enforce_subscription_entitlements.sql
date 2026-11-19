-- Enforce lister listing and lead entitlements in existing server-side workflows.

CREATE OR REPLACE FUNCTION public.can_create_lister_listing(p_owner_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_active_count INTEGER;
BEGIN
  IF p_owner_user_id IS DISTINCT FROM auth.uid() AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COALESCE(NULLIF(p.entitlements ->> 'active_listing_limit', '')::INTEGER, 0)
  INTO v_limit
  FROM public.subscription_plans p
  WHERE p.code = 'lister_free' AND p.is_active;

  SELECT COALESCE(NULLIF(p.entitlements ->> 'active_listing_limit', '')::INTEGER, 0)
  INTO v_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = p_owner_user_id
    AND p.audience = 'lister'
    AND s.status IN ('active', 'non-renewing', 'attention')
    AND (s.current_period_end > NOW() OR s.grace_until > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  SELECT COUNT(*)::INTEGER INTO v_active_count
  FROM public.listings
  WHERE owner_user_id = p_owner_user_id
    AND status = 'active';

  RETURN v_active_count < COALESCE(v_limit, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_lister_lead(
  p_listing_id UUID,
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_subscription public.subscriptions;
  v_plan public.subscription_plans;
  v_period public.usage_periods;
  v_limit INTEGER;
  v_used INTEGER;
BEGIN
  SELECT owner_user_id INTO v_owner_id
  FROM public.listings
  WHERE id = p_listing_id;

  IF v_owner_id IS NULL OR (v_owner_id IS DISTINCT FROM auth.uid() AND NOT private.is_admin()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.availability_requests
    WHERE id = p_request_id AND listing_id = p_listing_id
  ) THEN
    RAISE EXCEPTION 'Request does not belong to listing';
  END IF;

  SELECT s.* INTO v_subscription
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.user_id = v_owner_id
    AND p.audience = 'lister'
    AND s.status IN ('active', 'non-renewing', 'attention')
    AND (s.current_period_end > NOW() OR s.grace_until > NOW())
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_subscription.id IS NOT NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_subscription.plan_id;
  ELSE
    SELECT * INTO v_plan FROM public.subscription_plans
    WHERE code = 'lister_free' AND is_active;
  END IF;

  v_limit := NULLIF(v_plan.entitlements ->> 'monthly_lead_limit', '')::INTEGER;
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object('granted', TRUE, 'unlimited', TRUE, 'planCode', v_plan.code);
  END IF;

  INSERT INTO public.usage_periods (
    user_id, subscription_id, plan_id, period_start, period_end
  )
  VALUES (
    v_owner_id,
    v_subscription.id,
    v_plan.id,
    COALESCE(v_subscription.current_period_start, date_trunc('month', NOW())),
    COALESCE(v_subscription.current_period_end, date_trunc('month', NOW()) + INTERVAL '1 month')
  )
  ON CONFLICT (user_id, period_start, period_end) DO NOTHING;

  SELECT * INTO v_period
  FROM public.usage_periods
  WHERE user_id = v_owner_id
    AND period_start = COALESCE(v_subscription.current_period_start, date_trunc('month', NOW()))
    AND period_end = COALESCE(v_subscription.current_period_end, date_trunc('month', NOW()) + INTERVAL '1 month')
  FOR UPDATE;

  v_used := v_period.lister_leads_used;
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Monthly renter lead limit reached';
  END IF;

  INSERT INTO public.usage_events (usage_period_id, user_id, event_type, reference_id)
  VALUES (v_period.id, v_owner_id, 'lister_lead', p_request_id)
  ON CONFLICT (event_type, reference_id) DO NOTHING;

  UPDATE public.usage_periods
  SET lister_leads_used = lister_leads_used + 1, updated_at = NOW()
  WHERE id = v_period.id;

  RETURN jsonb_build_object(
    'granted', TRUE,
    'unlimited', FALSE,
    'planCode', v_plan.code,
    'remaining', v_limit - v_used - 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_availability(p_request_id UUID, p_decision TEXT)
RETURNS public.availability_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.availability_requests;
  v_listing_id UUID;
BEGIN
  SELECT * INTO v_row FROM public.availability_requests WHERE id = p_request_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  v_listing_id := v_row.listing_id;
  IF NOT private.is_admin() AND NOT private.owns_listing(v_listing_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_row.status NOT IN ('availability_pending', 'submitted', 'manual_escalation') THEN
    RAISE EXCEPTION 'Request is no longer awaiting a vacancy decision';
  END IF;

  IF lower(p_decision) IN ('yes', 'available', 'confirmed') THEN
    PERFORM public.reserve_lister_lead(v_listing_id, p_request_id);
    UPDATE public.availability_requests
    SET status = 'confirmed', confirmed_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.availability_requests
    SET status = 'unavailable', unavailable_at = NOW(), updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO v_row;

    UPDATE public.listings
    SET status = 'unavailable', updated_at = NOW()
    WHERE id = v_listing_id;
  END IF;

  RETURN v_row;
END;
$$;

DROP POLICY IF EXISTS "listings_owner_insert" ON public.listings;
CREATE POLICY "listings_owner_insert" ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND is_approved = FALSE
    AND status IN ('draft', 'pending_approval')
    AND public.can_create_lister_listing(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.admin_moderate_listing(
  p_listing_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.listings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.listings;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_action = 'approve' THEN
    IF NOT public.can_create_lister_listing((SELECT owner_user_id FROM public.listings WHERE id = p_listing_id)) THEN
      RAISE EXCEPTION 'Lister active listing limit reached';
    END IF;
    UPDATE public.listings
    SET status = 'active', is_approved = TRUE, approved_by = auth.uid(), approved_at = NOW(),
        rejection_reason = NULL, updated_at = NOW()
    WHERE id = p_listing_id
    RETURNING * INTO v_row;
  ELSIF p_action = 'reject' THEN
    UPDATE public.listings
    SET status = 'rejected', is_approved = FALSE, rejection_reason = p_reason, updated_at = NOW()
    WHERE id = p_listing_id
    RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'Unknown moderation action';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_create_lister_listing(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_lister_lead(UUID, UUID) TO authenticated;
