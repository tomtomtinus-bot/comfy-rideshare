-- Track which invitation round an assignment belongs to (1 = initial, 2 = retry, ...).
ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS invitation_round smallint NOT NULL DEFAULT 1;

-- Updated replacement-invite function: prefer client favorites first, then closest.
-- Also stamps invitation_round = max(existing) + 1 so we can distinguish retry rounds.
CREATE OR REPLACE FUNCTION public.invite_replacement_escorts(_ride_id uuid, _limit int DEFAULT 10)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride record;
  v_escort record;
  v_count int := 0;
  v_round smallint;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;

  SELECT COALESCE(MAX(invitation_round), 0) + 1
    INTO v_round
    FROM public.ride_assignments
   WHERE ride_id = _ride_id;

  FOR v_escort IN
    SELECT ep.id,
           EXISTS (
             SELECT 1 FROM public.client_favorite_escorts cfe
              WHERE cfe.client_id = v_ride.client_id AND cfe.escort_id = ep.id
           ) AS is_favorite,
           (6371 * 2 * asin(sqrt(
             power(sin(radians((v_ride.pickup_lat - ep.base_lat) / 2)), 2)
             + cos(radians(ep.base_lat)) * cos(radians(v_ride.pickup_lat))
               * power(sin(radians((v_ride.pickup_lng - ep.base_lng) / 2)), 2)
           ))) AS dist_km
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
     ORDER BY is_favorite DESC, dist_km ASC NULLS LAST
     LIMIT _limit
  LOOP
    INSERT INTO public.ride_assignments (
      ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min,
      responds_by, invitation_round
    ) VALUES (
      _ride_id, v_escort.id, 'invited', 0, 0,
      now() + interval '30 minutes', v_round
    );

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id, ride_id)
    VALUES (
      v_escort.id, 'replacement_invite',
      'Nieuwe ritaanvraag beschikbaar',
      'Er is een nieuwe rit beschikbaar: ' ||
      v_ride.pickup_city || ' → ' || v_ride.dropoff_city || '.',
      (SELECT id FROM public.ride_assignments
        WHERE ride_id = _ride_id AND escort_id = v_escort.id
        ORDER BY created_at DESC LIMIT 1),
      _ride_id
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.invite_replacement_escorts(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_replacement_escorts(uuid, int) TO authenticated, service_role;