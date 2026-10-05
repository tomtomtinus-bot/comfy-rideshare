ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_km numeric;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_created_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_direct_ride(
  _pickup_address text, _pickup_city text, _pickup_lat double precision, _pickup_lng double precision,
  _dropoff_address text, _dropoff_city text, _dropoff_lat double precision, _dropoff_lng double precision,
  _scheduled_at timestamptz, _permit_number text, _client_reference text, _notes text,
  _counterparty uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _client uuid; _escort uuid; _ride uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF NOT public.is_approved(_uid) THEN RAISE EXCEPTION 'Account nog niet goedgekeurd'; END IF;
  IF public.has_role(_uid, 'begeleider') THEN
    IF _counterparty IS NULL THEN RAISE EXCEPTION 'Kies een opdrachtgever'; END IF;
    IF NOT EXISTS (SELECT 1 FROM escort_preferred_clients WHERE escort_id = _uid AND client_id = _counterparty)
       AND NOT EXISTS (SELECT 1 FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.escort_id = _uid AND r.client_id = _counterparty) THEN
      RAISE EXCEPTION 'Onbekende opdrachtgever';
    END IF;
    _client := _counterparty; _escort := _uid;
  ELSE
    _client := _uid; _escort := _counterparty;
    IF _escort IS NOT NULL AND NOT EXISTS (SELECT 1 FROM escort_profiles WHERE id = _escort) THEN
      RAISE EXCEPTION 'Onbekende begeleider';
    END IF;
  END IF;

  INSERT INTO rides (client_id, pickup_address, pickup_city, pickup_lat, pickup_lng,
    dropoff_address, dropoff_city, dropoff_lat, dropoff_lng, scheduled_at, num_escorts,
    permit_number, client_reference, notes, status)
  VALUES (_client, _pickup_address, _pickup_city, _pickup_lat, _pickup_lng,
    _dropoff_address, _dropoff_city, _dropoff_lat, _dropoff_lng, _scheduled_at, 1,
    NULLIF(_permit_number,''), NULLIF(_client_reference,''), NULLIF(_notes,''),
    CASE WHEN _escort IS NULL THEN 'open'::ride_status ELSE 'matched'::ride_status END)
  RETURNING id INTO _ride;

  IF _escort IS NOT NULL THEN
    INSERT INTO ride_assignments (ride_id, escort_id, status, invited_at, responds_by, responded_at,
      travel_to_pickup_min, travel_back_home_min)
    VALUES (_ride, _escort, 'accepted', now(), now(), now(), 0, 0);
  END IF;
  RETURN _ride;
END $$;
REVOKE ALL ON FUNCTION public.create_direct_ride FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_ride TO authenticated;

CREATE OR REPLACE FUNCTION public.save_ride_ticket(_assignment_id uuid, _hours numeric, _km numeric, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _rate numeric;
BEGIN
  SELECT ra.*, r.client_id INTO _a FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = _assignment_id;
  IF _a IS NULL THEN RAISE EXCEPTION 'Rit niet gevonden'; END IF;
  IF _a.escort_id <> auth.uid() AND _a.client_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.invoiced_at IS NOT NULL THEN RAISE EXCEPTION 'Rit is al gefactureerd'; END IF;
  IF _hours IS NULL OR _hours < 0 OR _hours > 48 THEN RAISE EXCEPTION 'Ongeldig aantal uren'; END IF;
  IF _km IS NOT NULL AND (_km < 0 OR _km > 5000) THEN RAISE EXCEPTION 'Ongeldig aantal kilometers'; END IF;
  SELECT hourly_rate INTO _rate FROM escort_profiles WHERE id = _a.escort_id;
  UPDATE ride_assignments SET actual_hours = _hours, ticket_km = _km,
    actual_cost = ROUND(_hours * COALESCE(_rate,0), 2) + COALESCE(extra_costs_total,0),
    hours_notes = NULLIF(_notes,''), hours_submitted_at = COALESCE(hours_submitted_at, now()),
    hours_approved_at = COALESCE(hours_approved_at, now()), hours_approved_by = COALESCE(hours_approved_by, auth.uid()),
    ticket_created_at = now()
  WHERE id = _assignment_id;
  UPDATE rides SET status = 'completed' WHERE id = _a.ride_id AND status <> 'cancelled';
END $$;
REVOKE ALL ON FUNCTION public.save_ride_ticket FROM public, anon;
GRANT EXECUTE ON FUNCTION public.save_ride_ticket TO authenticated;

CREATE OR REPLACE FUNCTION public.invoice_selected_tickets(_assignment_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; _inv uuid; _n int := 0;
BEGIN
  FOR rec IN
    SELECT r.client_id, SUM(ra.actual_hours) hrs, SUM(COALESCE(ra.actual_cost,0)) amt,
           MIN(r.scheduled_at) ps, MAX(r.scheduled_at) pe, array_agg(ra.id) ids
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(_assignment_ids) AND ra.escort_id = auth.uid()
      AND ra.ticket_created_at IS NOT NULL AND ra.invoiced_at IS NULL AND ra.actual_hours IS NOT NULL
    GROUP BY r.client_id
  LOOP
    INSERT INTO invoices (escort_id, client_id, period_start, period_end, total_hours, total_amount, status)
    VALUES (auth.uid(), rec.client_id, rec.ps, rec.pe, rec.hrs, ROUND(rec.amt,2), 'sent') RETURNING id INTO _inv;
    INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT _inv, ra.id, ra.ride_id, r.scheduled_at, ra.actual_hours,
      CASE WHEN ra.actual_hours > 0 THEN ROUND((COALESCE(ra.actual_cost,0) - COALESCE(ra.extra_costs_total,0)) / ra.actual_hours, 2) ELSE 0 END,
      ROUND(COALESCE(ra.actual_cost,0), 2),
      r.pickup_city || ' → ' || r.dropoff_city || COALESCE(' · ' || ra.ticket_km || ' km', '')
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = ANY(rec.ids);
    UPDATE ride_assignments SET invoiced_at = now(), invoice_id = _inv WHERE id = ANY(rec.ids);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.invoice_selected_tickets FROM public, anon;
GRANT EXECUTE ON FUNCTION public.invoice_selected_tickets TO authenticated;