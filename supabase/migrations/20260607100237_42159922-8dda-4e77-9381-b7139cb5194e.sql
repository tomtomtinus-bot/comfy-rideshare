
DROP POLICY IF EXISTS "Authenticated view scheduled locations" ON public.escort_scheduled_locations;

CREATE POLICY "Owner or admin view scheduled locations"
ON public.escort_scheduled_locations
FOR SELECT
TO authenticated
USING (auth.uid() = escort_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.scheduled_locations_at(_at timestamptz)
RETURNS TABLE (escort_id uuid, address text, lat double precision, lng double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT escort_id, address, lat, lng
  FROM public.escort_scheduled_locations
  WHERE start_at <= _at AND end_at >= _at
$$;

REVOKE ALL ON FUNCTION public.scheduled_locations_at(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scheduled_locations_at(timestamptz) TO authenticated;
