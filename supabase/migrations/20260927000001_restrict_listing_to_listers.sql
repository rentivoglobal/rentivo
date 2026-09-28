-- Restrict property listings creation and updates strictly to landlords, agents, and admins
-- Prevents renter accounts (tenant, business_renter) from creating or updating listings

CREATE OR REPLACE FUNCTION private.is_lister_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() 
      AND role IN ('landlord'::public.user_role, 'agent'::public.user_role, 'admin'::public.user_role)
      AND is_active = TRUE
  );
$$;

DROP POLICY IF EXISTS listings_owner_insert ON public.listings;

CREATE POLICY listings_owner_insert
  ON public.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND is_approved = FALSE
    AND status IN ('draft'::listing_status, 'pending_approval'::listing_status)
    AND private.is_lister_or_admin()
  );

DROP POLICY IF EXISTS listings_owner_update ON public.listings;

CREATE POLICY listings_owner_update
  ON public.listings
  FOR UPDATE
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    AND private.is_lister_or_admin()
  )
  WITH CHECK (
    owner_user_id = auth.uid()
    AND is_approved = is_approved
    AND private.is_lister_or_admin()
  );
