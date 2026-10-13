CREATE TABLE public.ride_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  changed_by uuid,
  field text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ride_change_log_ride_idx ON public.ride_change_log(ride_id, created_at);
GRANT SELECT ON public.ride_change_log TO authenticated;
GRANT ALL ON public.ride_change_log TO service_role;
ALTER TABLE public.ride_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ride participants read change log" ON public.ride_change_log FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.ride_assignments ra WHERE ra.ride_id = ride_change_log.ride_id AND ra.escort_id = auth.uid() AND ra.status = 'accepted')
);

ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS schedule_changed_at timestamptz;

CREATE OR REPLACE FUNCTION public.log_ride_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid := auth.uid();
BEGIN
  IF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value)
    VALUES (NEW.id, _u, 'Datum/tijd', to_char(OLD.scheduled_at AT TIME ZONE 'Europe/Amsterdam','DD-MM-YYYY HH24:MI'), to_char(NEW.scheduled_at AT TIME ZONE 'Europe/Amsterdam','DD-MM-YYYY HH24:MI'));
    UPDATE ride_assignments SET schedule_changed_at = now()
    WHERE ride_id = NEW.id AND status = 'accepted' AND created_at < now();
  END IF;
  IF NEW.pickup_address IS DISTINCT FROM OLD.pickup_address THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value) VALUES (NEW.id, _u, 'Laadlocatie', OLD.pickup_address, NEW.pickup_address);
  END IF;
  IF NEW.dropoff_address IS DISTINCT FROM OLD.dropoff_address THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value) VALUES (NEW.id, _u, 'Loslocatie', OLD.dropoff_address, NEW.dropoff_address);
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value) VALUES (NEW.id, _u, 'Status', OLD.status::text, NEW.status::text);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER rides_log_changes AFTER UPDATE ON public.rides FOR EACH ROW EXECUTE FUNCTION public.log_ride_changes();

CREATE OR REPLACE FUNCTION public.log_assignment_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n text;
BEGIN
  SELECT COALESCE(NULLIF(full_name,''),'Begeleider') INTO _n FROM profiles WHERE id = NEW.escort_id;
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value) VALUES (NEW.ride_id, auth.uid(), 'Begeleider toegewezen', NULL, _n || COALESCE(' (' || NEW.escort_role || ')', ''));
  ELSIF TG_OP = 'UPDATE' AND NEW.ticket_status IS DISTINCT FROM OLD.ticket_status THEN
    INSERT INTO ride_change_log(ride_id, changed_by, field, old_value, new_value) VALUES (NEW.ride_id, auth.uid(), 'Ritbon ' || _n, OLD.ticket_status, NEW.ticket_status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ride_assignments_log_changes AFTER INSERT OR UPDATE ON public.ride_assignments FOR EACH ROW EXECUTE FUNCTION public.log_assignment_changes();

CREATE OR REPLACE FUNCTION public.get_ride_change_log(_ride_id uuid)
RETURNS TABLE(created_at timestamptz, who text, field text, old_value text, new_value text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.created_at, COALESCE(NULLIF(p.full_name,''), CASE WHEN l.changed_by IS NULL THEN 'Systeem' ELSE 'Onbekend' END), l.field, l.old_value, l.new_value
  FROM ride_change_log l LEFT JOIN profiles p ON p.id = l.changed_by
  WHERE l.ride_id = _ride_id
    AND (EXISTS (SELECT 1 FROM rides r WHERE r.id = _ride_id AND r.client_id = auth.uid())
      OR EXISTS (SELECT 1 FROM ride_assignments ra WHERE ra.ride_id = _ride_id AND ra.escort_id = auth.uid() AND ra.status = 'accepted'))
  ORDER BY l.created_at DESC LIMIT 100;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ride_change_log(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_ride_change_log(uuid) TO authenticated;