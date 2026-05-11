
CREATE OR REPLACE FUNCTION public.express_ride_interest(_assignment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_assn record;
  v_ride record;
  v_escort record;
  v_score numeric;
  v_repeat_count int;
  v_dist_km numeric;
  v_closes_at timestamptz;
  v_remaining int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.escort_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_assn.status <> 'invited' THEN RAISE EXCEPTION 'Niet meer beschikbaar'; END IF;
  IF v_assn.interest_expressed_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  IF v_ride.status = 'cancelled' THEN RAISE EXCEPTION 'Rit is geannuleerd'; END IF;

  SELECT base_lat, base_lng, rating
    INTO v_escort
    FROM public.escort_profiles
   WHERE id = v_caller;

  -- haversine in km
  v_dist_km := COALESCE(
    6371 * 2 * asin(sqrt(
      power(sin(radians((v_ride.pickup_lat - v_escort.base_lat) / 2)), 2)
      + cos(radians(v_escort.base_lat)) * cos(radians(v_ride.pickup_lat))
        * power(sin(radians((v_ride.pickup_lng - v_escort.base_lng) / 2)), 2)
    )), 0);

  SELECT count(*) INTO v_repeat_count
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
   WHERE ra.escort_id = v_caller
     AND r.client_id = v_ride.client_id
     AND ra.status IN ('accepted')
     AND ra.id <> _assignment_id;

  v_score := 100
           - (v_dist_km * 1.5)
           + (COALESCE(v_escort.rating, 5) * 10)
           + (LEAST(v_repeat_count, 5) * 4);

  -- Window closes 5 min from first interest, capped at responds_by
  v_closes_at := LEAST(now() + interval '5 minutes', v_assn.responds_by);

  UPDATE public.ride_assignments
     SET interest_expressed_at = now(),
         interest_score = v_score,
         broadcast_closes_at = COALESCE(broadcast_closes_at, v_closes_at)
   WHERE id = _assignment_id;

  -- Early close: if all 'invited' assignments for this ride have expressed interest, close immediately
  SELECT count(*) INTO v_remaining
    FROM public.ride_assignments
   WHERE ride_id = v_ride.id
     AND status = 'invited'
     AND interest_expressed_at IS NULL;

  IF v_remaining = 0 THEN
    UPDATE public.ride_assignments
       SET broadcast_closes_at = now()
     WHERE ride_id = v_ride.id
       AND status = 'invited';
  END IF;

  RETURN jsonb_build_object('ok', true, 'score', v_score, 'closes_at', v_closes_at, 'all_in', v_remaining = 0);
END;
$$;

REVOKE ALL ON FUNCTION public.express_ride_interest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.express_ride_interest(uuid) TO authenticated, service_role;
