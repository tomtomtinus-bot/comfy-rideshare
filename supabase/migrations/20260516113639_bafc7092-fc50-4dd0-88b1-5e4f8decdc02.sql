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
  dist_km double precision
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
           )))::double precision AS dist_km
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
     ORDER BY dist_km ASC NULLS LAST
     LIMIT _limit;
END;
$$;

-- Allow client to invite a specific replacement escort to their ride
CREATE OR REPLACE FUNCTION public.invite_specific_replacement(_ride_id uuid, _escort_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride record;
  v_caller uuid := auth.uid();
  v_assignment_id uuid;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE rides.id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_caller IS NULL OR (v_ride.client_id <> v_caller AND NOT public.has_role(v_caller, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ride_assignments WHERE ride_id=_ride_id AND escort_id=_escort_id AND status IN ('invited','accepted')) THEN
    RAISE EXCEPTION 'Begeleider is al uitgenodigd of geaccepteerd voor deze rit';
  END IF;

  INSERT INTO public.ride_assignments (ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min, responds_by)
  VALUES (_ride_id, _escort_id, 'invited', 0, 0, now() + interval '30 minutes')
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    _escort_id, 'replacement_invite',
    'Nieuwe rit (vervanging) beschikbaar',
    'Er is een vervangende plek vrijgekomen voor de rit ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city || '.',
    v_assignment_id
  );

  RETURN v_assignment_id;
END;
$$;