
CREATE OR REPLACE FUNCTION public.notify_ride_updated(_ride_id UUID, _summary TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_ride RECORD;
  v_assn RECORD;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;

  FOR v_assn IN
    SELECT id, escort_id FROM public.ride_assignments
     WHERE ride_id = _ride_id
       AND status IN ('accepted','invited')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (v_assn.escort_id, 'ride_updated',
            'Rit gewijzigd',
            'De opdrachtgever heeft de rit ' || v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
            ' bijgewerkt.' || CASE WHEN _summary IS NULL OR _summary = '' THEN '' ELSE ' ' || _summary END,
            v_assn.id);
  END LOOP;
END;
$$;
