DROP FUNCTION IF EXISTS public.find_replacement_candidates(uuid, integer);

CREATE OR REPLACE FUNCTION public.find_replacement_candidates(_ride_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  anonymous_id text,
  base_city text,
  hourly_rate numeric,
  rating numeric,
  rides_completed integer,
  vehicle_type text,
  languages text[],
  aanvoer_km double precision,
  afvoer_km double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride record;
  v_caller uuid := auth.uid();
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE rides.id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_caller IS NULL OR (v_ride.client_id <> v_caller AND NOT public.has_role(v_caller, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
    SELECT ep.id,
           ep.anonymous_id,
           ep.base_city,
           ep.hourly_rate,
           ep.rating,
           ep.rides_completed,
           ep.vehicle_type,
           ep.languages,
           (6371 * 2 * asin(sqrt(
             power(sin(radians((v_ride.pickup_lat - ep.base_lat) / 2)), 2)
             + cos(radians(ep.base_lat)) * cos(radians(v_ride.pickup_lat))
               * power(sin(radians((v_ride.pickup_lng - ep.base_lng) / 2)), 2)
           )))::double precision AS aanvoer_km,
           (6371 * 2 * asin(sqrt(
             power(sin(radians((v_ride.dropoff_lat - ep.base_lat) / 2)), 2)
             + cos(radians(ep.base_lat)) * cos(radians(v_ride.dropoff_lat))
               * power(sin(radians((v_ride.dropoff_lng - ep.base_lng) / 2)), 2)
           )))::double precision AS afvoer_km
      FROM public.escort_profiles ep
     WHERE ep.available = true
       AND v_ride.escort_type_required = ANY(ep.escort_types)
       AND NOT (ep.id = ANY(COALESCE(v_ride.excluded_escort_ids, '{}'::uuid[])))
       AND NOT EXISTS (
         SELECT 1 FROM public.ride_assignments ra
          WHERE ra.ride_id = _ride_id AND ra.escort_id = ep.id
       )
       AND (
         ep.client_filter_mode = 'all'
         OR (ep.client_filter_mode = 'only' AND EXISTS (
              SELECT 1 FROM public.escort_preferred_clients epc
               WHERE epc.escort_id = ep.id AND epc.client_id = v_ride.client_id))
         OR (ep.client_filter_mode = 'except' AND NOT EXISTS (
              SELECT 1 FROM public.escort_preferred_clients epc
               WHERE epc.escort_id = ep.id AND epc.client_id = v_ride.client_id))
       )
     ORDER BY aanvoer_km ASC NULLS LAST
     LIMIT _limit;
END;
$$;