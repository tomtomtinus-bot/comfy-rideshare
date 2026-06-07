-- The rides.ride_number column DEFAULT calls generate_ride_number() under
-- the inserting user's privileges, so authenticated users need EXECUTE.
-- The function itself is SECURITY DEFINER and only writes to an admin-only
-- sequence table, so this is safe. Anon stays revoked.
GRANT EXECUTE ON FUNCTION public.generate_ride_number() TO authenticated;
