-- Rentivo MVP schema, RLS, RPCs, and Ibadan seed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS private;

CREATE TYPE public.user_role AS ENUM (
  'tenant',
  'business_renter',
  'landlord',
  'agent',
  'inspector',
  'admin'
);

CREATE TYPE public.property_category AS ENUM ('residential', 'commercial');

CREATE TYPE public.property_type AS ENUM (
  'self_contain',
  'flat_apartment',
  'duplex',
  'bungalow',
  'shop',
  'office_space',
  'warehouse',
  'land'
);

CREATE TYPE public.listing_status AS ENUM (
  'draft',
  'pending_approval',
  'active',
  'unavailable',
  'suspended',
  'rejected',
  'removed'
);

CREATE TYPE public.verification_status AS ENUM (
  'unverified',
  'pending',
  'verified',
  'rejected'
);

CREATE TYPE public.request_status AS ENUM (
  'submitted',
  'availability_pending',
  'confirmed',
  'payment_pending',
  'paid',
  'unavailable',
  'manual_escalation',
  'expired',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'success',
  'failed',
  'abandoned',
  'refunded'
);

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'tenant',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT,
  agency_name TEXT,
  preferred_area TEXT,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL DEFAULT 'Oyo State',
  country_code VARCHAR(2) NOT NULL DEFAULT 'NG',
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_pilot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(city_id, slug)
);

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.property_category NOT NULL,
  property_type public.property_type NOT NULL,
  status public.listing_status NOT NULL DEFAULT 'pending_approval',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  price_amount BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  billing_period TEXT NOT NULL DEFAULT 'per_year',
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE RESTRICT,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  address_summary TEXT NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  size_sqm NUMERIC(10,2),
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.listing_private_details (
  listing_id UUID PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  address_full TEXT NOT NULL
);

CREATE TABLE public.listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  imagekit_file_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  file_path TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  alt_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status public.verification_status NOT NULL DEFAULT 'pending',
  scheduled_date DATE,
  preferred_time TEXT,
  on_site_contact_name TEXT,
  on_site_contact_phone TEXT,
  inspector_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  checklist_json JSONB NOT NULL DEFAULT '{
    "physicalVisitCompleted": false,
    "addressMatchesTitle": false,
    "listerMandateVerified": false,
    "photosAuthentic": false
  }'::jsonb,
  inspector_notes TEXT,
  decision_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.availability_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  renter_name TEXT NOT NULL,
  renter_phone TEXT NOT NULL,
  renter_email TEXT NOT NULL,
  status public.request_status NOT NULL DEFAULT 'availability_pending',
  email_confirmation_token_hash TEXT,
  token_expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  unavailable_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  contact_unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_request_id UUID NOT NULL REFERENCES public.availability_requests(id) ON DELETE CASCADE,
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_kobo BIGINT NOT NULL DEFAULT 500000,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'NGN',
  provider TEXT NOT NULL DEFAULT 'paystack',
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_transaction_id TEXT,
  channel TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  raw_webhook_payload JSONB,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  availability_request_id UUID NOT NULL REFERENCES public.availability_requests(id) ON DELETE CASCADE UNIQUE,
  promotion_code TEXT NOT NULL DEFAULT 'FIRST100',
  fee_waived_amount_kobo BIGINT NOT NULL DEFAULT 500000,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listings_active_filter ON public.listings (status, is_approved, city_id, area_id, category, property_type);
CREATE INDEX idx_listings_price ON public.listings (price_amount);
CREATE INDEX idx_listings_verified ON public.listings (is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_photos_listing ON public.listing_photos (listing_id, sort_order);
CREATE INDEX idx_requests_renter ON public.availability_requests (renter_user_id, status);
CREATE INDEX idx_requests_listing ON public.availability_requests (listing_id, status);
CREATE INDEX idx_requests_escalation ON public.availability_requests (status, created_at);
CREATE INDEX idx_payments_reference ON public.payments (paystack_reference);
CREATE INDEX idx_favorites_user ON public.favorites (user_id);

-- Authorization helpers live in private schema (not on user_metadata)
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION private.is_lister()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('landlord', 'agent') AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION private.owns_listing(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listings
    WHERE id = p_listing_id AND owner_user_id = auth.uid()
  );
$$;

-- Signup sync: never accept admin/inspector from client metadata
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
  IF v_role NOT IN ('tenant', 'business_renter', 'landlord', 'agent') THEN
    v_role := 'tenant';
  END IF;

  INSERT INTO public.users (id, email, full_name, phone, whatsapp, agency_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Rentivo Member'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', NEW.raw_user_meta_data->>'phone', ''),
    NEW.raw_user_meta_data->>'agency_name',
    v_role::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_unlocked_lister_contact(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_renter_id UUID;
  v_request_status public.request_status;
  v_listing_id UUID;
  v_lister_data JSONB;
BEGIN
  SELECT renter_user_id, status, listing_id
  INTO v_renter_id, v_request_status, v_listing_id
  FROM public.availability_requests
  WHERE id = p_request_id;

  IF v_listing_id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_renter_id AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You are not permitted to view this contact';
  END IF;

  IF v_request_status <> 'paid' THEN
    RAISE EXCEPTION 'Payment required: Landlord contact is locked until payment is verified';
  END IF;

  SELECT jsonb_build_object(
    'fullName', u.full_name,
    'phone', u.phone,
    'whatsapp', COALESCE(u.whatsapp, u.phone),
    'agencyName', u.agency_name,
    'exactAddress', COALESCE(p.address_full, l.address_summary),
    'memberSince', u.created_at,
    'role', u.role
  )
  INTO v_lister_data
  FROM public.listings l
  JOIN public.users u ON u.id = l.owner_user_id
  LEFT JOIN public.listing_private_details p ON p.listing_id = l.id
  WHERE l.id = v_listing_id;

  RETURN v_lister_data;
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

CREATE OR REPLACE FUNCTION public.verify_availability_token(p_token_hash TEXT, p_decision TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.availability_requests;
BEGIN
  SELECT * INTO v_row
  FROM public.availability_requests
  WHERE email_confirmation_token_hash = p_token_hash
  LIMIT 1;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired confirmation link';
  END IF;

  IF v_row.token_expires_at IS NOT NULL AND v_row.token_expires_at < NOW() THEN
    RAISE EXCEPTION 'This confirmation link has expired';
  END IF;

  v_row := public.respond_to_availability(v_row.id, p_decision);

  RETURN jsonb_build_object(
    'requestId', v_row.id,
    'listingId', v_row.listing_id,
    'status', v_row.status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_first100_waiver(p_request_id UUID)
RETURNS public.availability_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.availability_requests;
  v_count INTEGER;
  v_cap INTEGER := 100;
BEGIN
  SELECT * INTO v_row FROM public.availability_requests WHERE id = p_request_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  IF auth.uid() IS DISTINCT FROM v_row.renter_user_id AND NOT private.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF v_row.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Waiver is only available after vacancy is confirmed';
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.promotion_redemptions;
  IF v_count >= v_cap THEN
    RAISE EXCEPTION 'Promotion waiver pool has reached the 100-user limit';
  END IF;

  INSERT INTO public.promotion_redemptions (renter_user_id, availability_request_id)
  VALUES (v_row.renter_user_id, v_row.id);

  UPDATE public.availability_requests
  SET status = 'paid', contact_unlocked_at = NOW(), updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_moderate_listing(p_listing_id UUID, p_action TEXT, p_reason TEXT DEFAULT NULL)
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

CREATE OR REPLACE FUNCTION public.admin_issue_verified_badge(
  p_listing_id UUID,
  p_checklist JSONB,
  p_notes TEXT DEFAULT NULL
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

  UPDATE public.listings
  SET is_verified = TRUE, verified_at = NOW(), updated_at = NOW()
  WHERE id = p_listing_id
  RETURNING * INTO v_row;

  UPDATE public.verification_requests
  SET status = 'verified',
      checklist_json = COALESCE(p_checklist, checklist_json),
      inspector_notes = COALESCE(p_notes, inspector_notes),
      decided_at = NOW(),
      updated_at = NOW()
  WHERE listing_id = p_listing_id AND status IN ('pending', 'unverified');

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.escalate_stale_requests(p_hours INTEGER DEFAULT 2)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.availability_requests
  SET status = 'manual_escalation', escalated_at = NOW(), updated_at = NOW()
  WHERE status = 'availability_pending'
    AND created_at < NOW() - make_interval(hours => p_hours);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_promo_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', 100,
    'redeemed', (SELECT COUNT(*) FROM public.promotion_redemptions),
    'remaining', GREATEST(0, 100 - (SELECT COUNT(*) FROM public.promotion_redemptions)),
    'isActive', (SELECT COUNT(*) FROM public.promotion_redemptions) < 100
  );
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_self_or_admin" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.is_admin());

CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY "cities_public_read" ON public.cities FOR SELECT USING (true);
CREATE POLICY "areas_public_read" ON public.areas FOR SELECT USING (true);
CREATE POLICY "cities_admin_write" ON public.cities FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());
CREATE POLICY "areas_admin_write" ON public.areas FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "listings_public_approved" ON public.listings
  FOR SELECT
  USING (status = 'active' AND is_approved = TRUE);

CREATE POLICY "listings_owner_read" ON public.listings
  FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid() OR private.is_admin());

CREATE POLICY "listings_owner_insert" ON public.listings
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid() AND is_approved = FALSE AND status IN ('draft', 'pending_approval'));

CREATE POLICY "listings_owner_update" ON public.listings
  FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid() AND is_approved = listings.is_approved);

CREATE POLICY "listings_admin_all" ON public.listings
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY "private_address_owner_admin" ON public.listing_private_details
  FOR ALL TO authenticated
  USING (private.owns_listing(listing_id) OR private.is_admin())
  WITH CHECK (private.owns_listing(listing_id) OR private.is_admin());

CREATE POLICY "photos_public_or_owner" ON public.listing_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_photos.listing_id
        AND (
          (l.status = 'active' AND l.is_approved = TRUE)
          OR l.owner_user_id = auth.uid()
          OR private.is_admin()
        )
    )
  );

CREATE POLICY "photos_owner_write" ON public.listing_photos
  FOR ALL TO authenticated
  USING (private.owns_listing(listing_id) OR private.is_admin())
  WITH CHECK (private.owns_listing(listing_id) OR private.is_admin());

CREATE POLICY "verification_owner_read" ON public.verification_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid() OR private.owns_listing(listing_id) OR private.is_admin());

CREATE POLICY "verification_owner_insert" ON public.verification_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND private.owns_listing(listing_id));

CREATE POLICY "verification_admin_all" ON public.verification_requests
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY "requests_renter_read" ON public.availability_requests
  FOR SELECT TO authenticated
  USING (renter_user_id = auth.uid() OR private.owns_listing(listing_id) OR private.is_admin());

CREATE POLICY "requests_renter_insert" ON public.availability_requests
  FOR INSERT TO authenticated
  WITH CHECK (renter_user_id = auth.uid());

CREATE POLICY "payments_renter_read" ON public.payments
  FOR SELECT TO authenticated
  USING (renter_user_id = auth.uid() OR private.is_admin());

CREATE POLICY "promo_renter_read" ON public.promotion_redemptions
  FOR SELECT TO authenticated
  USING (renter_user_id = auth.uid() OR private.is_admin());

CREATE POLICY "favorites_own" ON public.favorites
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "reports_read" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_user_id = auth.uid() OR private.is_admin());

CREATE POLICY "reports_admin_update" ON public.reports
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY "audit_admin_read" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE OR REPLACE FUNCTION private.prevent_owner_self_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.is_admin() THEN
    NEW.is_approved := OLD.is_approved;
    NEW.approved_by := OLD.approved_by;
    NEW.approved_at := OLD.approved_at;
    IF OLD.is_approved = FALSE AND NEW.status = 'active' THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_prevent_self_approve
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.prevent_owner_self_approve();

GRANT SELECT ON public.cities, public.areas, public.listings, public.listing_photos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.users,
  public.listings,
  public.listing_private_details,
  public.listing_photos,
  public.verification_requests,
  public.availability_requests,
  public.payments,
  public.promotion_redemptions,
  public.favorites,
  public.reports,
  public.audit_logs
TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities, public.areas TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_unlocked_lister_contact(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_availability(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_availability_token(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_first100_waiver(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_moderate_listing(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_issue_verified_badge(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_requests(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_promo_stats() TO anon, authenticated;

-- Ibadan launch seed (Lagos / Abeokuta remain inactive Phase 2)
INSERT INTO public.cities (name, slug, state, is_active, is_pilot) VALUES
  ('Ibadan', 'ibadan', 'Oyo State', TRUE, TRUE),
  ('Lagos', 'lagos', 'Lagos State', FALSE, FALSE),
  ('Abeokuta', 'abeokuta', 'Ogun State', FALSE, FALSE);

INSERT INTO public.areas (city_id, name, slug)
SELECT c.id, a.name, a.slug
FROM public.cities c
CROSS JOIN (
  VALUES
    ('Bodija', 'bodija'),
    ('Ring Road', 'ring-road'),
    ('Oluyole', 'oluyole'),
    ('Oluyole Estate', 'oluyole-estate'),
    ('Akobo', 'akobo'),
    ('UI / Samonda', 'ui-samonda'),
    ('UI area', 'ui-area'),
    ('Samonda', 'samonda'),
    ('Jericho', 'jericho'),
    ('Agodi', 'agodi'),
    ('Agodi GRA', 'agodi-gra'),
    ('Challenge', 'challenge'),
    ('Dugbe', 'dugbe'),
    ('Iwo Road', 'iwo-road'),
    ('Ikolaba', 'ikolaba'),
    ('Eleyele', 'eleyele'),
    ('Moniya', 'moniya'),
    ('Apata', 'apata'),
    ('Ologuneru', 'ologuneru')
) AS a(name, slug)
WHERE c.slug = 'ibadan';
