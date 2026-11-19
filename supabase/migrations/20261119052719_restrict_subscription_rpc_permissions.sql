REVOKE EXECUTE ON FUNCTION public.get_current_entitlements(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_renter_unlock(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_usage_summary(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_current_entitlements(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_renter_unlock(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_summary(UUID) TO authenticated;
