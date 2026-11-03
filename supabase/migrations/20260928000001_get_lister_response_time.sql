-- Migration: 20260928000001_get_lister_response_time.sql
-- Function to calculate dynamic average confirmation response time from request history

CREATE OR REPLACE FUNCTION public.get_lister_response_time(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_avg_mins NUMERIC;
  v_sample_cnt INT;
  v_is_specific BOOLEAN := false;
BEGIN
  -- 1. Try listing-specific history
  SELECT 
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60),
    COUNT(*)
  INTO v_avg_mins, v_sample_cnt
  FROM public.availability_requests
  WHERE listing_id = p_listing_id
    AND status IN ('confirmed', 'paid', 'unavailable')
    AND updated_at > created_at
    AND EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 BETWEEN 1 AND 1440;

  IF v_sample_cnt > 0 THEN
    v_is_specific := true;
  ELSE
    -- 2. Try lister-specific portfolio history
    SELECT owner_user_id INTO v_owner_id
    FROM public.listings
    WHERE id = p_listing_id;

    IF v_owner_id IS NOT NULL THEN
      SELECT 
        AVG(EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 60),
        COUNT(*)
      INTO v_avg_mins, v_sample_cnt
      FROM public.availability_requests ar
      JOIN public.listings l ON l.id = ar.listing_id
      WHERE l.owner_user_id = v_owner_id
        AND ar.status IN ('confirmed', 'paid', 'unavailable')
        AND ar.updated_at > ar.created_at
        AND EXTRACT(EPOCH FROM (ar.updated_at - ar.created_at)) / 60 BETWEEN 1 AND 1440;

      IF v_sample_cnt > 0 THEN
        v_is_specific := true;
      END IF;
    END IF;
  END IF;

  -- 3. Fallback to platform-wide average
  IF v_sample_cnt IS NULL OR v_sample_cnt = 0 THEN
    SELECT 
      AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60),
      COUNT(*)
    INTO v_avg_mins, v_sample_cnt
    FROM public.availability_requests
    WHERE status IN ('confirmed', 'paid', 'unavailable')
      AND updated_at > created_at
      AND EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 BETWEEN 1 AND 1440;
    v_is_specific := false;
  END IF;

  IF v_sample_cnt IS NULL OR v_sample_cnt = 0 THEN
    RETURN jsonb_build_object(
      'avg_minutes', 24,
      'sample_count', 0,
      'is_lister_specific', false
    );
  END IF;

  RETURN jsonb_build_object(
    'avg_minutes', GREATEST(1, ROUND(v_avg_mins)::INT),
    'sample_count', v_sample_cnt,
    'is_lister_specific', v_is_specific
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lister_response_time(UUID) TO anon, authenticated;
