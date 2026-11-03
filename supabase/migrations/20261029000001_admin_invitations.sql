-- Migration: 20261029000001_admin_invitations.sql
-- Table and RPC functions for Admin Team Invitation and Management

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'auditor')),
  token TEXT UNIQUE NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON public.admin_invitations (token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON public.admin_invitations (email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON public.admin_invitations (status);

-- Enable RLS
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on invitations
DROP POLICY IF EXISTS "admin_invitations_admin_all" ON public.admin_invitations;
CREATE POLICY "admin_invitations_admin_all" ON public.admin_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RPC to validate token for public invitation acceptance (callable without login)
CREATE OR REPLACE FUNCTION public.get_admin_invitation_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
BEGIN
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

  IF v_inv.expires_at < NOW() THEN
    UPDATE public.admin_invitations SET status = 'expired' WHERE id = v_inv.id;
    RETURN jsonb_build_object('success', false, 'error', 'This invitation link has expired. Please request a new invite.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_inv.id,
    'email', v_inv.email,
    'full_name', v_inv.full_name,
    'role', v_inv.role,
    'invited_by_name', v_inv.invited_by_name,
    'notes', v_inv.notes,
    'expires_at', v_inv.expires_at
  );
END;
$$;

-- RPC to accept invitation for an authenticated user
CREATE OR REPLACE FUNCTION public.accept_admin_invitation(p_token TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv RECORD;
BEGIN
  SELECT * INTO v_inv
  FROM public.admin_invitations
  WHERE token = p_token;

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

  -- 1. Upgrade user in public.users to admin
  UPDATE public.users
  SET role = 'admin',
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 2. Mark invitation as accepted
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
