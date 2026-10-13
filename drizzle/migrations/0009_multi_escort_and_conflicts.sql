ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS escort_role text;

CREATE OR REPLACE FUNCTION public.add_ride_escort(_ride_id uuid, _escort_id uuid, _role text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _r rides%ROWTYPE; _id uuid; _new boolean := false;
BEGIN
  SELECT * INTO _r FROM rides WHERE id = _ride_id;
  IF _r.id IS NULL OR _r.client_id <> _uid THEN RAISE EXCEPTION 'Geen toegang tot deze rit'; END IF;
  IF NOT is_relation(_uid, _escort_id) THEN RAISE EXCEPTION 'Deze begeleider is (nog) geen vaste relatie'; END IF;
  IF _role IS NOT NULL AND length(_role) > 40 THEN RAISE EXCEPTION 'Rol te lang'; END IF;
  SELECT id INTO _id FROM ride_assignments WHERE ride_id = _ride_id AND escort_id = _escort_id;
  IF _id IS NULL THEN
    INSERT INTO ride_assignments (ride_id, escort_id, status, invited_at, responds_by, responded_at, travel_to_pickup_min, travel_back_home_min, escort_role)
    VALUES (_ride_id, _escort_id, 'accepted', now(), now(), now(), 0, 0, NULLIF(_role,''))
    RETURNING id INTO _id;
    _new := true;
  ELSE
    UPDATE ride_assignments SET escort_role = NULLIF(_role,''), status = 'accepted' WHERE id = _id;
  END IF;
  UPDATE rides SET num_escorts = GREATEST(1, (SELECT count(*) FROM ride_assignments WHERE ride_id = _ride_id AND status = 'accepted')),
    status = CASE WHEN status = 'open' THEN 'matched'::ride_status ELSE status END
  WHERE id = _ride_id;
  IF _new THEN
    INSERT INTO notifications (user_id, type, title, body, ride_id)
    VALUES (_escort_id, 'ride_assigned', 'Nieuwe rit toegewezen' || COALESCE(' (' || NULLIF(_role,'') || ')', ''),
      _r.pickup_city || ' → ' || _r.dropoff_city || ' op ' || to_char(_r.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI'), _ride_id);
  END IF;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.add_ride_escort(uuid, uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_ride_escort(uuid, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_escort_conflicts(_escort_id uuid, _at timestamptz, _exclude_ride uuid DEFAULT NULL)
RETURNS TABLE(ride_label text, scheduled_at timestamptz, own boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r.client_id = auth.uid() OR ra.escort_id = auth.uid() THEN r.ride_number || ' ' || r.pickup_city || ' → ' || r.dropoff_city ELSE 'Rit bij een andere planner' END,
         r.scheduled_at, (r.client_id = auth.uid())
  FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id
  WHERE ra.escort_id = _escort_id
    AND (auth.uid() = _escort_id OR is_relation(auth.uid(), _escort_id))
    AND ra.status IN ('invited','accepted')
    AND r.status NOT IN ('cancelled','completed')
    AND (_exclude_ride IS NULL OR r.id <> _exclude_ride)
    AND r.scheduled_at < _at + interval '8 hours'
    AND r.scheduled_at + make_interval(mins => COALESCE((ra.estimated_hours * 60)::int, 480)) > _at
  ORDER BY r.scheduled_at;
$$;
REVOKE EXECUTE ON FUNCTION public.check_escort_conflicts(uuid, timestamptz, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_escort_conflicts(uuid, timestamptz, uuid) TO authenticated;