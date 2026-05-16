CREATE OR REPLACE FUNCTION public.notifications_fill_ride_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ride_id IS NULL AND NEW.ride_assignment_id IS NOT NULL THEN
    SELECT ride_id INTO NEW.ride_id FROM public.ride_assignments WHERE id = NEW.ride_assignment_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_fill_ride_id ON public.notifications;
CREATE TRIGGER trg_notifications_fill_ride_id
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notifications_fill_ride_id();