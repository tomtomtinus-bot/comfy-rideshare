CREATE OR REPLACE FUNCTION public.calc_ride_ticket(_assignment_id uuid, _hours numeric, _km numeric, _waiting numeric,
  _expense_items jsonb, _correction numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _rr record; _local timestamp; _hrs numeric; _billable numeric; _hourly numeric; _kmr numeric;
  _hours_amt numeric := 0; _km_amt numeric := 0; _wait_amt numeric := 0; _fixed_amt numeric := 0; _sur_pct numeric := 0;
  _sur_label text := NULL; _sur_amt numeric := 0; _fuel numeric := 0; _exp numeric := 0; _sub numeric;
BEGIN
  SELECT ra.escort_id, r.client_id, r.scheduled_at, r.rate_type, r.rate_amount INTO _a
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = _assignment_id;
  IF _a IS NULL OR auth.uid() NOT IN (_a.escort_id, _a.client_id) THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  SELECT * INTO _rr FROM relation_rates WHERE relation_id = relation_id_between(_a.escort_id, _a.client_id);
  _hrs := COALESCE(_hours, 0);
  _hourly := COALESCE(CASE WHEN _a.rate_type='hourly' THEN _a.rate_amount END, NULLIF(_rr.hourly_rate,0),
                      (SELECT hourly_rate FROM escort_profiles WHERE id=_a.escort_id), 0);
  _kmr := COALESCE(CASE WHEN _a.rate_type='km' THEN _a.rate_amount END, _rr.km_rate, 0);
  _billable := GREATEST(_hrs, COALESCE(_rr.min_hours, 0));
  IF _a.rate_type = 'fixed' THEN
    _fixed_amt := COALESCE(_a.rate_amount, 0); _billable := _hrs;
  ELSE
    _hours_amt := ROUND(_billable * _hourly, 2);
  END IF;
  _km_amt := ROUND(COALESCE(_km,0) * _kmr, 2);
  _wait_amt := ROUND(COALESCE(_waiting,0) * COALESCE(NULLIF(_rr.waiting_rate,0), _hourly), 2);
  _local := _a.scheduled_at AT TIME ZONE 'Europe/Amsterdam';
  IF nl_is_holiday(_local::date) AND COALESCE(_rr.holiday_pct,0) > _sur_pct THEN _sur_pct := _rr.holiday_pct; _sur_label := 'Feestdagtoeslag'; END IF;
  IF extract(dow FROM _local) IN (0,6) AND COALESCE(_rr.weekend_pct,0) > _sur_pct THEN _sur_pct := _rr.weekend_pct; _sur_label := 'Weekendtoeslag'; END IF;
  IF (extract(hour FROM _local) < 6 OR extract(hour FROM _local) >= 22) AND COALESCE(_rr.night_pct,0) > _sur_pct THEN _sur_pct := _rr.night_pct; _sur_label := 'Nachttoeslag'; END IF;
  _sur_amt := ROUND((_hours_amt + _fixed_amt) * _sur_pct / 100, 2);
  _fuel := COALESCE(compute_fuel_surcharge(_a.escort_id, _a.scheduled_at, _billable, _hours_amt + _fixed_amt), 0);
  SELECT COALESCE(SUM((e->>'amount')::numeric), 0) INTO _exp FROM jsonb_array_elements(COALESCE(_expense_items,'[]'::jsonb)) e;
  _sub := _hours_amt + _fixed_amt + _km_amt + _wait_amt + _sur_amt + _fuel + _exp + COALESCE(_correction, 0);
  RETURN jsonb_build_object(
    'hours', _hrs, 'billable_hours', _billable, 'min_hours', COALESCE(_rr.min_hours,0), 'hourly_rate', _hourly, 'hours_amount', _hours_amt,
    'fixed_amount', _fixed_amt, 'km', COALESCE(_km,0), 'km_rate', _kmr, 'km_amount', _km_amt,
    'waiting_hours', COALESCE(_waiting,0), 'waiting_rate', COALESCE(NULLIF(_rr.waiting_rate,0), _hourly), 'waiting_amount', _wait_amt,
    'surcharge_label', _sur_label, 'surcharge_pct', _sur_pct, 'surcharge_amount', _sur_amt, 'fuel_amount', _fuel,
    'expenses', COALESCE(_expense_items,'[]'::jsonb), 'expenses_amount', _exp,
    'correction', COALESCE(_correction,0), 'subtotal', ROUND(_sub, 2), 'rates_source', CASE WHEN _rr IS NULL THEN 'default' ELSE 'relation' END);
END $$;

CREATE OR REPLACE FUNCTION public.invoice_selected_tickets(_assignment_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; t record; _inv uuid; _n int := 0; _b jsonb; e jsonb;
BEGIN
  FOR rec IN
    SELECT r.client_id, SUM(ra.actual_hours) hrs, SUM(COALESCE(ra.actual_cost,0)) amt,
           MIN(r.scheduled_at) ps, MAX(r.scheduled_at) pe, array_agg(ra.id) ids
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(_assignment_ids) AND ra.escort_id = auth.uid()
      AND ra.ticket_status = 'approved' AND ra.invoiced_at IS NULL
    GROUP BY r.client_id
  LOOP
    INSERT INTO invoices (escort_id, client_id, period_start, period_end, total_hours, total_amount, status)
    VALUES (auth.uid(), rec.client_id, rec.ps, rec.pe, rec.hrs, ROUND(rec.amt,2), 'sent') RETURNING id INTO _inv;
    FOR t IN SELECT ra.id, ra.ride_id, ra.actual_hours, ra.actual_cost, ra.ticket_breakdown, r.scheduled_at, r.pickup_city, r.dropoff_city
             FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = ANY(rec.ids) LOOP
      _b := t.ticket_breakdown;
      IF _b IS NULL THEN
        INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
        VALUES (_inv, t.id, t.ride_id, t.scheduled_at, t.actual_hours, 0, ROUND(COALESCE(t.actual_cost,0),2), t.pickup_city || ' → ' || t.dropoff_city);
        CONTINUE;
      END IF;
      IF (_b->>'fixed_amount')::numeric > 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, (_b->>'hours')::numeric, 0, (_b->>'fixed_amount')::numeric, 'Extra kosten: Vaste prijs rit');
      ELSE
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, (_b->>'billable_hours')::numeric, (_b->>'hourly_rate')::numeric, (_b->>'hours_amount')::numeric,
          t.pickup_city || ' → ' || t.dropoff_city);
      END IF;
      IF (_b->>'km_amount')::numeric > 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (_b->>'km_amount')::numeric,
          'Extra kosten: Kilometers ' || (_b->>'km') || ' km × € ' || (_b->>'km_rate'));
      END IF;
      IF (_b->>'waiting_amount')::numeric > 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (_b->>'waiting_amount')::numeric,
          'Extra kosten: Wachturen ' || (_b->>'waiting_hours') || ' u × € ' || (_b->>'waiting_rate'));
      END IF;
      IF (_b->>'surcharge_amount')::numeric > 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (_b->>'surcharge_amount')::numeric,
          'Extra kosten: ' || (_b->>'surcharge_label') || ' ' || (_b->>'surcharge_pct') || '%');
      END IF;
      IF COALESCE((_b->>'fuel_amount')::numeric,0) > 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (_b->>'fuel_amount')::numeric, 'Brandstoftoeslag');
      END IF;
      FOR e IN SELECT * FROM jsonb_array_elements(COALESCE(_b->'expenses','[]'::jsonb)) LOOP
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (e->>'amount')::numeric,
          'Extra kosten: ' || COALESCE(NULLIF(e->>'description',''), 'Onkosten'));
      END LOOP;
      IF COALESCE((_b->>'correction')::numeric,0) <> 0 THEN
        INSERT INTO invoice_items VALUES (gen_random_uuid(), _inv, t.id, t.ride_id, t.scheduled_at, 0, 0, (_b->>'correction')::numeric,
          'Extra kosten: Correctie' || COALESCE(' – ' || (_b->>'correction_note'), ''));
      END IF;
    END LOOP;
    UPDATE ride_assignments SET invoiced_at = now(), invoice_id = _inv WHERE id = ANY(rec.ids);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;