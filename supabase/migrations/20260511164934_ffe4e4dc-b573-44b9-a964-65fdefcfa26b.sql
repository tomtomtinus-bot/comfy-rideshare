CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escort_id uuid;
  v_client_id uuid;
  v_status assignment_status;
  v_recipient uuid;
  v_sender_name text;
BEGIN
  SELECT ra.escort_id, r.client_id, ra.status
    INTO v_escort_id, v_client_id, v_status
  FROM ride_assignments ra
  JOIN rides r ON r.id = ra.ride_id
  WHERE ra.id = NEW.assignment_id;

  IF v_status IS DISTINCT FROM 'accepted'::assignment_status THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = v_escort_id THEN
    v_recipient := v_client_id;
  ELSIF NEW.sender_id = v_client_id THEN
    v_recipient := v_escort_id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT COALESCE(company_name, full_name, 'Iemand') INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, ride_assignment_id, title, body)
  VALUES (
    v_recipient,
    'message',
    NEW.assignment_id,
    'Nieuw bericht van ' || COALESCE(v_sender_name, 'gebruiker'),
    left(NEW.body, 140)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();