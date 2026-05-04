
REVOKE EXECUTE ON FUNCTION public.is_ride_client(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_assigned_escort(uuid, uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_ride_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_escort(uuid, uuid) TO authenticated;
