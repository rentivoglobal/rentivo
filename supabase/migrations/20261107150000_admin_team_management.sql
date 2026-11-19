CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the invited account to accept this invitation.');
  END IF;

  SELECT * INTO v_inv
  FROM public.admin_invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invitation token.');
  END IF;

  IF v_inv.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invitation is not in pending state.');
  END IF;

  IF v_inv.expires_at < NOW() THEN
    UPDATE public.admin_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('success', false, 'error', 'Invitation has expired.');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = p_user_id
      AND LOWER(email) = LOWER(v_inv.email)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sign in with the email address this invitation was sent to.');
  END IF;

  UPDATE public.users
  SET role = 'admin',
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your account profile could not be found.');
  END IF;

  UPDATE public.admin_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Admin privileges successfully granted.',
    'email', v_inv.email,
    'role', v_inv.role
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accept_admin_invitation(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_admin_invitation(TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_remove_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_count INTEGER;
BEGIN
  IF v_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = v_admin_id
      AND role = 'admin'
      AND is_active = TRUE
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only an active administrator can manage team access.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('rentivo_admin_team')::BIGINT);

  IF p_user_id = v_admin_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot remove your own administrator account.');
  END IF;

  SELECT COUNT(*) INTO v_admin_count
  FROM public.users
  WHERE role = 'admin'
    AND is_active = TRUE;

  IF v_admin_count <= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the last remaining administrator.');
  END IF;

  UPDATE public.users
  SET role = 'tenant',
      updated_at = NOW()
  WHERE id = p_user_id
    AND role = 'admin';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Administrator was not found.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_remove_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_user(UUID) TO authenticated;
