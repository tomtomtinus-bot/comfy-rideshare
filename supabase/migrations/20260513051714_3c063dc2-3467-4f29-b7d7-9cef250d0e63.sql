
ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS hours_dispute_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS hours_dispute_reason text,
  ADD COLUMN IF NOT EXISTS hours_disputed_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_hours_dispute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route text;
BEGIN
  -- Notify escort when hours are newly disputed
  IF NEW.hours_dispute_status = 'disputed'
     AND COALESCE(OLD.hours_dispute_status, 'none') <> 'disputed' THEN
    SELECT (r.pickup_city || ' → ' || r.dropoff_city)
      INTO v_route
      FROM public.rides r
     WHERE r.id = NEW.ride_id;

    INSERT INTO public.notifications (user_id, ride_assignment_id, type, title, body)
    VALUES (
      NEW.escort_id,
      NEW.id,
      'hours_disputed',
      'Uren afgewezen door opdrachtgever',
      'De opdrachtgever heeft je ingevulde uren voor de rit (' || COALESCE(v_route, '') || ') afgewezen.'
        || CASE WHEN NEW.hours_dispute_reason IS NOT NULL AND length(NEW.hours_dispute_reason) > 0
                THEN ' Reden: ' || NEW.hours_dispute_reason
                ELSE '' END
        || ' Pas je uren aan en dien ze opnieuw in.'
    );
  END IF;

  -- Auto-resolve when escort resubmits hours after dispute
  IF NEW.hours_submitted_at IS DISTINCT FROM OLD.hours_submitted_at
     AND COALESCE(OLD.hours_dispute_status, 'none') = 'disputed'
     AND NEW.hours_dispute_status = 'disputed' THEN
    NEW.hours_dispute_status := 'resolved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_hours_dispute ON public.ride_assignments;
CREATE TRIGGER trg_handle_hours_dispute
BEFORE UPDATE ON public.ride_assignments
FOR EACH ROW
EXECUTE FUNCTION public.handle_hours_dispute();
