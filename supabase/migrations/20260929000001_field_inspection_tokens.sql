-- Migration: 20260929000001_field_inspection_tokens.sql
-- Table and RPC functions for tokenized, frictionless on-site physical property verification

CREATE TABLE IF NOT EXISTS public.property_inspection_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  verification_request_id UUID REFERENCES public.verification_requests(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted', 'expired', 'revoked')),
  inspector_name TEXT,
  inspector_phone TEXT,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_accuracy_meters DOUBLE PRECISION,
  gps_captured_at TIMESTAMPTZ,
  dossier_json JSONB,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on token for instant lookups
CREATE INDEX IF NOT EXISTS idx_inspection_token ON public.property_inspection_tokens (token);
CREATE INDEX IF NOT EXISTS idx_inspection_listing ON public.property_inspection_tokens (listing_id);

-- Enable RLS
ALTER TABLE public.property_inspection_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
DROP POLICY IF EXISTS "inspection_tokens_admin_all" ON public.property_inspection_tokens;
CREATE POLICY "inspection_tokens_admin_all" ON public.property_inspection_tokens
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- RPC to retrieve listing metadata for an inspection token (callable by anon/field inspectors without login)
CREATE OR REPLACE FUNCTION public.get_inspection_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_listing RECORD;
  v_photos JSONB;
BEGIN
  SELECT * INTO v_rec
  FROM public.property_inspection_tokens
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid inspection link.');
  END IF;

  IF v_rec.status = 'submitted' THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'submitted',
      'submitted_at', v_rec.submitted_at,
      'inspector_name', v_rec.inspector_name
    );
  END IF;

  IF v_rec.expires_at < NOW() OR v_rec.status = 'expired' OR v_rec.status = 'revoked' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This inspection link has expired or has been revoked.'
    );
  END IF;

  -- Fetch listing summary
  SELECT 
    l.id, l.title, l.description, l.category, l.property_type, l.address_summary,
    l.bedrooms, l.bathrooms, l.price_amount, l.billing_period,
    c.name as city_name, a.name as area_name,
    u.full_name as lister_name, u.phone as lister_phone
  INTO v_listing
  FROM public.listings l
  LEFT JOIN public.cities c ON c.id = l.city_id
  LEFT JOIN public.areas a ON a.id = l.area_id
  LEFT JOIN public.users u ON u.id = l.owner_user_id
  WHERE l.id = v_rec.listing_id;

  -- Fetch up to 3 listing cover photos for inspector orientation
  SELECT COALESCE(jsonb_agg(jsonb_build_object('url', lp.url, 'thumbnail', lp.thumbnail_url)), '[]'::jsonb)
  INTO v_photos
  FROM (
    SELECT url, thumbnail_url
    FROM public.listing_photos
    WHERE listing_id = v_rec.listing_id
    ORDER BY sort_order ASC
    LIMIT 3
  ) lp;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'active',
    'token', v_rec.token,
    'expires_at', v_rec.expires_at,
    'listing', jsonb_build_object(
      'id', v_listing.id,
      'title', v_listing.title,
      'category', v_listing.category,
      'property_type', v_listing.property_type,
      'address_summary', v_listing.address_summary,
      'area', COALESCE(v_listing.area_name, 'Ibadan'),
      'city', COALESCE(v_listing.city_name, 'Ibadan'),
      'bedrooms', v_listing.bedrooms,
      'bathrooms', v_listing.bathrooms,
      'price_amount', v_listing.price_amount,
      'billing_period', v_listing.billing_period,
      'lister_name', COALESCE(v_listing.lister_name, 'Verified Lister'),
      'lister_phone', COALESCE(v_listing.lister_phone, ''),
      'photos', v_photos
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_inspection_by_token(TEXT) TO anon, authenticated;

-- RPC to submit property inspection dossier (Single-use atomic submission by field inspector)
CREATE OR REPLACE FUNCTION public.submit_property_inspection(
  p_token TEXT,
  p_inspector_name TEXT,
  p_inspector_phone TEXT,
  p_gps_lat DOUBLE PRECISION,
  p_gps_lng DOUBLE PRECISION,
  p_gps_accuracy DOUBLE PRECISION,
  p_dossier JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Lock row for update to prevent concurrent submissions
  SELECT * INTO v_rec
  FROM public.property_inspection_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid inspection token.');
  END IF;

  IF v_rec.status = 'submitted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This physical inspection has already been submitted and locked.');
  END IF;

  IF v_rec.expires_at < v_now OR v_rec.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This inspection token is no longer active.');
  END IF;

  -- Update token to submitted and store full dossier
  UPDATE public.property_inspection_tokens
  SET
    status = 'submitted',
    inspector_name = TRIM(p_inspector_name),
    inspector_phone = TRIM(p_inspector_phone),
    gps_latitude = p_gps_lat,
    gps_longitude = p_gps_lng,
    gps_accuracy_meters = p_gps_accuracy,
    gps_captured_at = v_now,
    dossier_json = p_dossier,
    submitted_at = v_now,
    updated_at = v_now
  WHERE id = v_rec.id;

  -- Update corresponding verification_requests if linked
  IF v_rec.verification_request_id IS NOT NULL THEN
    UPDATE public.verification_requests
    SET
      status = 'progress',
      inspector_notes = CONCAT('On-site inspection completed by ', TRIM(p_inspector_name), ' on ', TO_CHAR(v_now, 'YYYY-MM-DD HH24:MI')),
      updated_at = v_now
    WHERE id = v_rec.verification_request_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Inspection dossier submitted successfully and locked.',
    'submitted_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_property_inspection(TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, JSONB) TO anon, authenticated;
