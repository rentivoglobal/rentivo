-- Harden admin invitation RPCs without changing invitation data.
-- Acceptance is only possible for the signed-in, email-confirmed account whose
-- verified email matches the pending invitation.

CREATE OR REPLACE FUNCTION public.get_admin_invitation_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  v_inv public.admin_invitations%ROWTYPE;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token.');
  END IF;

  SELECT * INTO v_inv
  FROM public.admin_invitations
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token.');
  END IF;

  IF v_inv.status = 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has already been accepted.');
  END IF;

  IF v_inv.status = 'revoked' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation has been revoked by an administrator.');
  END IF;

  IF v_inv.status <> 'pending' OR v_inv.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invitation link has expired. Please request a new invite.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'email', v_inv.email,
    'full_name', v_inv.full_name,
    'role', v_inv.role,
    'invited_by_name', v_inv.invited_by_name,
    'notes', v_inv.notes,
    'expires_at', v_inv.expires_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_auth_email TEXT;
  v_email_confirmed_at TIMESTAMPTZ;
  v_inv public.admin_invitations%ROWTYPE;
  v_updated_rows INTEGER;
BEGIN
  IF v_caller_id IS NULL OR p_user_id IS DISTINCT FROM v_caller_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the invited account to accept this invitation.');
  END IF;

  SELECT lower(btrim(u.email)), u.email_confirmed_at
  INTO v_auth_email, v_email_confirmed_at
  FROM auth.users AS u
  WHERE u.id = v_caller_id;

  IF NOT FOUND OR v_auth_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'The authenticated account could not be verified.');
  END IF;

  IF v_email_confirmed_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Confirm your email address before accepting this administrator invitation.');
  END IF;

  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token.');
  END IF;

  SELECT * INTO v_inv
  FROM public.admin_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token.');
  END IF;

  IF v_inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is not in pending state.');
  END IF;

  IF v_inv.expires_at <= now() THEN
    UPDATE public.admin_invitations
    SET status = 'expired', updated_at = now()
    WHERE id = v_inv.id AND status = 'pending';
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired.');
  END IF;

  IF lower(btrim(v_inv.email)) <> v_auth_email THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the email address this invitation was sent to.');
  END IF;

  UPDATE public.users
  SET role = 'admin', updated_at = now()
  WHERE id = v_caller_id
    AND lower(btrim(email)) = v_auth_email;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows <> 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'The Rentivo account profile could not be found for this verified email.');
  END IF;

  UPDATE public.admin_invitations
  SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = v_inv.id AND status = 'pending';

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  IF v_updated_rows <> 1 THEN
    RAISE EXCEPTION 'Invitation state changed during acceptance';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Admin privileges successfully granted.',
    'email', v_inv.email,
    'role', v_inv.role
  );
END;
$$;

-- Token lookup is intentionally public and read-only; acceptance is not.
REVOKE ALL ON FUNCTION public.get_admin_invitation_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_invitation_by_token(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.accept_admin_invitation(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_admin_invitation(TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(TEXT, UUID) TO authenticated;


-- Phone-verification codes are generated/validated only by the authenticated Edge Function.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.phone_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 10),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_challenges_user_created
  ON public.phone_verification_challenges (user_id, created_at DESC);

ALTER TABLE public.phone_verification_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.phone_verification_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.phone_verification_challenges TO service_role;
