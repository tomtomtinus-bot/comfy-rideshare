-- Lock down SECURITY DEFINER helpers that are only used internally by the
-- insert trigger on public.rides. Anon/PUBLIC must not be able to invoke them.

REVOKE EXECUTE ON FUNCTION public.generate_ride_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_ride_number() FROM PUBLIC, anon;

-- Keep service_role (edge functions / admin code) able to call them.
GRANT EXECUTE ON FUNCTION public.generate_ride_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_ride_number() TO service_role;

-- Authenticated users insert rides via PostgREST; the trigger fires as the
-- function owner regardless, so they do NOT need direct EXECUTE here.
