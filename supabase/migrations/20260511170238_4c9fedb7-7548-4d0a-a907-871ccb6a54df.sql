
-- 1. Add excluded escorts list per ride (for replacement search)
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS excluded_escort_ids uuid[] NOT NULL DEFAULT '{}';

-- 2. Backfill: alle bestaande geannuleerde ritten → afgerond
UPDATE public.rides SET status = 'completed' WHERE status = 'cancelled';

-- 3. Helper: zoek en nodig automatisch nieuwe begeleiders uit voor een rit
--    (sluit excluded_escort_ids + reeds betrokken escorts uit)
CREATE OR REPLACE FUNCTION public.invite_replacement_escorts(_ride_id uuid, _limit int DEFAULT 10)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride record;
  v_escort record;
  v_count int := 0;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;

  FOR v_escort IN
    SELECT ep.id,
           ep.base_lat,
           ep.base_lng,
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
     ORDER BY dist_km ASC NULLS LAST
     LIMIT _limit
  LOOP
    INSERT INTO public.ride_assignments (
      ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min, responds_by
    ) VALUES (
      _ride_id, v_escort.id, 'invited', 0, 0, now() + interval '30 minutes'
    );

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (
      v_escort.id,
      'replacement_invite',
      'Nieuwe rit (vervanging) beschikbaar',
      'Er is een vervangende plek vrijgekomen voor de rit ' ||
      v_ride.pickup_city || ' → ' || v_ride.dropoff_city || '.',
      (SELECT id FROM public.ride_assignments
        WHERE ride_id = _ride_id AND escort_id = v_escort.id
        ORDER BY created_at DESC LIMIT 1)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_replacement_escorts(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_replacement_escorts(uuid, int) TO authenticated, service_role;

-- 4. client_cancel_ride → eindstatus 'completed' i.p.v. 'cancelled'
CREATE OR REPLACE FUNCTION public.client_cancel_ride(_ride_id UUID, _reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_ride RECORD;
  v_assn RECORD;
  v_min_hours NUMERIC;
  v_rate NUMERIC;
  v_fee NUMERIC;
  v_late BOOLEAN;
  v_charged_count INT := 0;
  v_total_fee NUMERIC := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_ride.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Rit is reeds afgesloten'; END IF;

  v_late := (v_ride.scheduled_at - now()) < interval '4 hours';

  FOR v_assn IN
    SELECT ra.id, ra.escort_id, ra.estimated_hours, ra.estimated_cost,
           COALESCE(ep.min_billable_hours, 0) AS min_h,
           COALESCE(ep.hourly_rate, 35) AS rate
    FROM public.ride_assignments ra
    LEFT JOIN public.escort_profiles ep ON ep.id = ra.escort_id
    WHERE ra.ride_id = _ride_id
      AND ra.status = 'accepted'
  LOOP
    v_min_hours := v_assn.min_h;
    IF v_assn.estimated_hours IS NOT NULL AND v_assn.estimated_hours > 0
       AND v_assn.estimated_cost IS NOT NULL THEN
      v_rate := v_assn.estimated_cost / v_assn.estimated_hours;
    ELSE
      v_rate := v_assn.rate;
    END IF;

    IF v_late AND v_min_hours > 0 THEN
      v_fee := ROUND(v_min_hours * v_rate, 2);
      UPDATE public.ride_assignments
         SET status = 'cancelled',
             cancellation_fee = v_fee,
             actual_hours = v_min_hours,
             actual_cost = v_fee,
             hours_submitted_at = now(),
             hours_notes = COALESCE(hours_notes, '') ||
               CASE WHEN COALESCE(hours_notes, '') = '' THEN '' ELSE E'\n' END ||
               'Late annulering door opdrachtgever — minimumtarief.'
       WHERE id = v_assn.id;
      v_charged_count := v_charged_count + 1;
      v_total_fee := v_total_fee + v_fee;

      INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
      VALUES (v_assn.escort_id, 'ride_cancelled_late',
              'Rit geannuleerd (minimumvergoeding)',
              'Een rit binnen 4 uur is geannuleerd door de opdrachtgever. Je krijgt het minimumtarief (' ||
              v_min_hours::text || 'u × ' || to_char(v_rate, 'FM999990.00') || ' = € ' ||
              to_char(v_fee, 'FM999990.00') || ') uitbetaald.', v_assn.id);
    ELSE
      UPDATE public.ride_assignments
         SET status = 'cancelled',
             cancellation_fee = 0
       WHERE id = v_assn.id;

      INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
      VALUES (v_assn.escort_id, 'ride_cancelled',
              'Rit geannuleerd',
              'De opdrachtgever heeft de rit ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
              ' geannuleerd.', v_assn.id);
    END IF;
  END LOOP;

  UPDATE public.ride_assignments
     SET status = 'cancelled'
   WHERE ride_id = _ride_id
     AND status = 'invited';

  -- Markeer als afgerond (i.p.v. cancelled) — alle annulerings­ritten gaan naar afgerond
  UPDATE public.rides
     SET status = 'completed',
         cancelled_at = now(),
         cancelled_by = v_caller,
         cancellation_reason = _reason
   WHERE id = _ride_id;

  RETURN jsonb_build_object(
    'late', v_late,
    'charged_escorts', v_charged_count,
    'total_fee', v_total_fee
  );
END;
$$;

-- 5. client_decide_cancellation → optie '_search_replacement' (auto-uitnodigen)
CREATE OR REPLACE FUNCTION public.client_decide_cancellation(
  _assignment_id UUID,
  _approve BOOLEAN,
  _search_replacement BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_assn RECORD;
  v_ride RECORD;
  v_remaining_accepted INT;
  v_invited_count INT := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.cancel_request_status <> 'pending' THEN RAISE EXCEPTION 'Geen openstaand verzoek'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF NOT _approve THEN
    UPDATE public.ride_assignments
       SET cancel_request_status = 'rejected',
           cancel_decided_at = now()
     WHERE id = _assignment_id;

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (v_assn.escort_id, 'cancel_rejected',
            'Annulering afgewezen',
            'Je annuleringsverzoek voor ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
            ' is afgewezen door de opdrachtgever. De toewijzing blijft staan.', _assignment_id);
    RETURN jsonb_build_object('approved', false);
  END IF;

  -- Goedgekeurd: cancel deze toewijzing + voeg escort toe aan excluded list
  UPDATE public.ride_assignments
     SET status = 'cancelled',
         cancel_request_status = 'approved',
         cancel_decided_at = now(),
         cancellation_fee = 0
   WHERE id = _assignment_id;

  UPDATE public.rides
     SET excluded_escort_ids = ARRAY(
           SELECT DISTINCT unnest(COALESCE(excluded_escort_ids, '{}'::uuid[]) || ARRAY[v_assn.escort_id])
         )
   WHERE id = v_ride.id;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (v_assn.escort_id, 'cancel_approved',
          'Annulering goedgekeurd',
          'Je annuleringsverzoek voor ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
          ' is goedgekeurd. Geen kosten.', _assignment_id);

  IF _search_replacement THEN
    UPDATE public.rides SET status = 'open' WHERE id = v_ride.id;
    v_invited_count := public.invite_replacement_escorts(v_ride.id, 10);
    RETURN jsonb_build_object('approved', true, 'replacement', true, 'invited', v_invited_count);
  END IF;

  -- Geen vervanger gezocht → als er geen geaccepteerde begeleiders meer over zijn, rit naar afgerond
  SELECT count(*) INTO v_remaining_accepted
    FROM public.ride_assignments
   WHERE ride_id = v_ride.id AND status = 'accepted';

  IF v_remaining_accepted = 0 THEN
    UPDATE public.rides SET status = 'completed' WHERE id = v_ride.id;
  END IF;

  RETURN jsonb_build_object('approved', true, 'replacement', false, 'remaining_accepted', v_remaining_accepted);
END;
$$;
