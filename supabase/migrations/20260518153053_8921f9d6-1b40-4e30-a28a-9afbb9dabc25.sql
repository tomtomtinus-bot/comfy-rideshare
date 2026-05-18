
-- Notify driver on assignment, notify planner on hours submission
CREATE OR REPLACE FUNCTION public.notify_driver_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride RECORD;
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL
     AND (OLD.assigned_driver_id IS DISTINCT FROM NEW.assigned_driver_id)
     AND NEW.assigned_driver_id <> NEW.escort_id THEN
    SELECT pickup_city, dropoff_city, scheduled_at INTO v_ride
    FROM rides WHERE id = NEW.ride_id;
    INSERT INTO notifications (user_id, type, ride_assignment_id, ride_id, title, body)
    VALUES (
      NEW.assigned_driver_id,
      'driver_assigned',
      NEW.id,
      NEW.ride_id,
      'Nieuwe rit toegewezen',
      'Je bent toegewezen aan een rit ' || COALESCE(v_ride.pickup_city, '?') || ' → ' || COALESCE(v_ride.dropoff_city, '?') ||
      ' op ' || to_char(v_ride.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI')
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_driver_assignment ON public.ride_assignments;
CREATE TRIGGER trg_notify_driver_assignment
AFTER INSERT OR UPDATE OF assigned_driver_id ON public.ride_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_driver_assignment();

CREATE OR REPLACE FUNCTION public.notify_planner_hours_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride RECORD;
BEGIN
  IF NEW.hours_submitted_at IS NOT NULL
     AND OLD.hours_submitted_at IS DISTINCT FROM NEW.hours_submitted_at
     AND NEW.assigned_driver_id IS NOT NULL
     AND NEW.assigned_driver_id <> NEW.escort_id THEN
    SELECT pickup_city, dropoff_city INTO v_ride FROM rides WHERE id = NEW.ride_id;
    INSERT INTO notifications (user_id, type, ride_assignment_id, ride_id, title, body)
    VALUES (
      NEW.escort_id,
      'hours_submitted',
      NEW.id,
      NEW.ride_id,
      'Uren ter goedkeuring',
      'Je chauffeur heeft ' || COALESCE(NEW.actual_hours::text, '?') || ' uur ingediend voor de rit ' ||
      COALESCE(v_ride.pickup_city, '?') || ' → ' || COALESCE(v_ride.dropoff_city, '?')
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_planner_hours_submitted ON public.ride_assignments;
CREATE TRIGGER trg_notify_planner_hours_submitted
AFTER UPDATE OF hours_submitted_at ON public.ride_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_planner_hours_submitted();
