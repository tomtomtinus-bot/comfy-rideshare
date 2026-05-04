CREATE OR REPLACE FUNCTION public.notify_ride_confirmed(_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escort uuid;
  v_client uuid;
  v_anon text;
  v_route text;
  v_when timestamptz;
BEGIN
  SELECT ra.escort_id, r.client_id, ep.anonymous_id,
         (r.pickup_city || ' → ' || r.dropoff_city), r.scheduled_at
    INTO v_escort, v_client, v_anon, v_route, v_when
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    LEFT JOIN public.escort_profiles ep ON ep.id = ra.escort_id
   WHERE ra.id = _assignment_id;

  IF v_escort IS NULL THEN
    RAISE EXCEPTION 'Assignment not found';
  END IF;

  -- Only the assigned escort can send this confirmation
  IF v_escort <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_client,
    'ride_confirmed',
    'Rit bevestigd',
    'Begeleider #' || COALESCE(v_anon, '????') || ' heeft uw rit ' || v_route ||
      ' op ' || to_char(v_when AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || ' bevestigd.',
    _assignment_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.notify_ride_confirmed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notify_ride_confirmed(uuid) TO authenticated;