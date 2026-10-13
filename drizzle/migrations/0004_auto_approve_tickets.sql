CREATE OR REPLACE FUNCTION public.submit_ride_ticket_v2(_assignment_id uuid, _hours numeric, _km numeric, _waiting_hours numeric, _expense_items jsonb, _correction numeric, _correction_note text, _notes text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record; _b jsonb; _exp numeric;
BEGIN
  SELECT ra.*, r.client_id, r.pickup_city, r.dropoff_city INTO _a FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = _assignment_id;
  IF _a IS NULL OR _a.escort_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.invoiced_at IS NOT NULL THEN RAISE EXCEPTION 'Ritbon is al gefactureerd'; END IF;
  IF _hours IS NULL OR _hours < 0 OR _hours > 48 THEN RAISE EXCEPTION 'Ongeldig aantal uren'; END IF;
  IF COALESCE(_km,0) NOT BETWEEN 0 AND 5000 OR COALESCE(_waiting_hours,0) NOT BETWEEN 0 AND 48 THEN RAISE EXCEPTION 'Ongeldige kilometers of wachturen'; END IF;
  IF COALESCE(_correction,0) NOT BETWEEN -10000 AND 10000 THEN RAISE EXCEPTION 'Ongeldige correctie'; END IF;
  IF jsonb_typeof(COALESCE(_expense_items,'[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(_expense_items,'[]'::jsonb)) > 30
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(_expense_items,'[]'::jsonb)) e
                WHERE (e->>'amount') IS NULL OR (e->>'amount')::numeric NOT BETWEEN 0 AND 10000 OR length(COALESCE(e->>'description','')) > 200) THEN
    RAISE EXCEPTION 'Ongeldige onkosten';
  END IF;
  _b := calc_ride_ticket(_assignment_id, _hours, _km, _waiting_hours, _expense_items, _correction)
        || jsonb_build_object('correction_note', NULLIF(_correction_note,''));
  _exp := (_b->>'expenses_amount')::numeric;
  UPDATE ride_assignments SET actual_hours=_hours, ticket_km=_km, ticket_waiting_hours=_waiting_hours,
    ticket_expense_items=COALESCE(_expense_items,'[]'::jsonb), ticket_expenses=_exp,
    ticket_correction=_correction, ticket_correction_note=NULLIF(_correction_note,''), hours_notes=NULLIF(_notes,''),
    extra_costs_total=_exp, actual_cost=(_b->>'subtotal')::numeric, ticket_breakdown=_b,
    hours_submitted_at=now(), ticket_created_at=now(), ticket_status='approved', ticket_reject_reason=NULL,
    hours_approved_at=now(), hours_approved_by=NULL
  WHERE id=_assignment_id;
  UPDATE rides SET status='completed' WHERE id=_a.ride_id AND status <> 'cancelled';
  INSERT INTO notifications (user_id, type, title, body, ride_id, ride_assignment_id)
  VALUES (_a.client_id, 'ticket_submitted', 'Ritbon ingediend', _a.pickup_city || ' → ' || _a.dropoff_city || ': ritbon automatisch goedgekeurd. Klopt er iets niet? Keur hem af.', _a.ride_id, _assignment_id);
  RETURN _b;
END $function$;

CREATE OR REPLACE FUNCTION public.review_ride_ticket(_assignment_id uuid, _approve boolean, _reason text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record;
BEGIN
  SELECT ra.*, r.client_id, r.pickup_city, r.dropoff_city INTO _a FROM ride_assignments ra JOIN rides r ON r.id=ra.ride_id WHERE ra.id=_assignment_id;
  IF _a IS NULL OR _a.client_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.invoiced_at IS NOT NULL THEN RAISE EXCEPTION 'Ritbon is al gefactureerd'; END IF;
  IF _a.ticket_status NOT IN ('submitted','approved') THEN RAISE EXCEPTION 'Er is geen ritbon om te beoordelen'; END IF;
  UPDATE ride_assignments SET ticket_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    ticket_reject_reason = CASE WHEN _approve THEN NULL ELSE NULLIF(_reason,'') END,
    hours_approved_at = CASE WHEN _approve THEN now() END, hours_approved_by = CASE WHEN _approve THEN auth.uid() END
  WHERE id=_assignment_id;
  INSERT INTO notifications (user_id, type, title, body, ride_id, ride_assignment_id)
  VALUES (_a.escort_id, 'ticket_reviewed', CASE WHEN _approve THEN 'Ritbon goedgekeurd' ELSE 'Ritbon afgekeurd' END,
    _a.pickup_city || ' → ' || _a.dropoff_city || COALESCE(': ' || NULLIF(_reason,''), ''), _a.ride_id, _assignment_id);
END $function$;