
-- 1. Add cancellation fields to ride_assignments
ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS cancel_request_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cancel_request_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- 2. Client cancels entire ride
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
  IF v_ride.status = 'cancelled' THEN RAISE EXCEPTION 'Already cancelled'; END IF;

  v_late := (v_ride.scheduled_at - now()) < interval '4 hours';

  -- Process accepted assignments
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
    -- Derive effective rate from estimated, fallback to escort default
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

  -- Cancel still-invited assignments (no fee)
  UPDATE public.ride_assignments
     SET status = 'cancelled'
   WHERE ride_id = _ride_id
     AND status = 'invited';

  -- Mark ride cancelled
  UPDATE public.rides
     SET status = 'cancelled',
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

-- 3. Escort requests cancellation (in overleg)
CREATE OR REPLACE FUNCTION public.escort_request_cancellation(_assignment_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_assn RECORD;
  v_ride RECORD;
  v_anon TEXT;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Reden is verplicht';
  END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.escort_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_assn.status <> 'accepted' THEN RAISE EXCEPTION 'Alleen geaccepteerde toewijzingen'; END IF;
  IF v_assn.cancel_request_status = 'pending' THEN RAISE EXCEPTION 'Al een verzoek lopend'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  SELECT anonymous_id INTO v_anon FROM public.escort_profiles WHERE id = v_caller;

  UPDATE public.ride_assignments
     SET cancel_request_status = 'pending',
         cancel_request_reason = _reason,
         cancel_requested_at = now(),
         cancel_decided_at = NULL
   WHERE id = _assignment_id;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (v_ride.client_id, 'cancel_requested',
          'Annuleringsverzoek begeleider',
          'Begeleider #' || COALESCE(v_anon, '????') || ' vraagt annulering aan voor de rit ' ||
          v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
          '. Reden: ' || _reason, _assignment_id);
END;
$$;

-- 4. Client decides on escort cancellation request
CREATE OR REPLACE FUNCTION public.client_decide_cancellation(_assignment_id UUID, _approve BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_assn RECORD;
  v_ride RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.cancel_request_status <> 'pending' THEN RAISE EXCEPTION 'Geen openstaand verzoek'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF _approve THEN
    UPDATE public.ride_assignments
       SET status = 'cancelled',
           cancel_request_status = 'approved',
           cancel_decided_at = now(),
           cancellation_fee = 0
     WHERE id = _assignment_id;

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (v_assn.escort_id, 'cancel_approved',
            'Annulering goedgekeurd',
            'Je annuleringsverzoek voor ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
            ' is goedgekeurd. Geen kosten.', _assignment_id);
  ELSE
    UPDATE public.ride_assignments
       SET cancel_request_status = 'rejected',
           cancel_decided_at = now()
     WHERE id = _assignment_id;

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (v_assn.escort_id, 'cancel_rejected',
            'Annulering afgewezen',
            'Je annuleringsverzoek voor ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
            ' is afgewezen door de opdrachtgever. De toewijzing blijft staan.', _assignment_id);
  END IF;
END;
$$;
