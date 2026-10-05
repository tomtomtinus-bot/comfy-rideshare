CREATE TABLE public.relation_rates (
  relation_id uuid PRIMARY KEY REFERENCES public.relations(id) ON DELETE CASCADE,
  hourly_rate numeric NOT NULL DEFAULT 0,
  km_rate numeric NOT NULL DEFAULT 0,
  min_hours numeric NOT NULL DEFAULT 0,
  waiting_rate numeric NOT NULL DEFAULT 0,
  night_pct numeric NOT NULL DEFAULT 0,
  weekend_pct numeric NOT NULL DEFAULT 0,
  holiday_pct numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.relation_rates TO authenticated;
GRANT ALL ON public.relation_rates TO service_role;
ALTER TABLE public.relation_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Relation participants read rates" ON public.relation_rates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relations r WHERE r.id = relation_id AND auth.uid() IN (r.requester_id, r.addressee_id)));

ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_breakdown jsonb;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_expense_items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_correction numeric;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_correction_note text;

CREATE OR REPLACE FUNCTION public.relation_id_between(_a uuid, _b uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM relations WHERE status='accepted'
   AND ((requester_id=_a AND addressee_id=_b) OR (requester_id=_b AND addressee_id=_a)) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.set_relation_rates(_relation_id uuid, _hourly numeric, _km numeric, _min_hours numeric,
  _waiting numeric, _night_pct numeric, _weekend_pct numeric, _holiday_pct numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM relations WHERE id=_relation_id AND status='accepted' AND auth.uid() IN (requester_id, addressee_id))
     OR NOT has_role(auth.uid(), 'begeleider') THEN
    RAISE EXCEPTION 'Alleen de begeleider binnen deze relatie kan tarieven instellen';
  END IF;
  IF LEAST(_hourly,_km,_min_hours,_waiting,_night_pct,_weekend_pct,_holiday_pct) < 0
     OR GREATEST(_hourly,_waiting) > 1000 OR _km > 50 OR _min_hours > 24 OR GREATEST(_night_pct,_weekend_pct,_holiday_pct) > 300 THEN
    RAISE EXCEPTION 'Ongeldige tariefwaarden';
  END IF;
  INSERT INTO relation_rates (relation_id, hourly_rate, km_rate, min_hours, waiting_rate, night_pct, weekend_pct, holiday_pct, updated_at, updated_by)
  VALUES (_relation_id, _hourly, _km, _min_hours, _waiting, _night_pct, _weekend_pct, _holiday_pct, now(), auth.uid())
  ON CONFLICT (relation_id) DO UPDATE SET hourly_rate=EXCLUDED.hourly_rate, km_rate=EXCLUDED.km_rate, min_hours=EXCLUDED.min_hours,
    waiting_rate=EXCLUDED.waiting_rate, night_pct=EXCLUDED.night_pct, weekend_pct=EXCLUDED.weekend_pct, holiday_pct=EXCLUDED.holiday_pct,
    updated_at=now(), updated_by=auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.nl_is_holiday(_d date) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE y int := extract(year FROM _d); a int; b int; c int; d int; e int; f int; g int; h int; i int; k int; l int; m int; mo int; dy int; easter date; kd date;
BEGIN
  a := y % 19; b := y / 100; c := y % 100; d := b / 4; e := b % 4; f := (b + 8) / 25; g := (b - f + 1) / 3;
  h := (19*a + b - d - g + 15) % 30; i := c / 4; k := c % 4; l := (32 + 2*e + 2*i - h - k) % 7;
  m := (a + 11*h + 22*l) / 451; mo := (h + l - 7*m + 114) / 31; dy := ((h + l - 7*m + 114) % 31) + 1;
  easter := make_date(y, mo, dy);
  kd := make_date(y, 4, 27); IF extract(dow FROM kd) = 0 THEN kd := kd - 1; END IF;
  RETURN _d IN (make_date(y,1,1), easter - 2, easter, easter + 1, kd, make_date(y,5,5), easter + 39, easter + 49, easter + 50,
                make_date(y,12,25), make_date(y,12,26));
END $$;

CREATE OR REPLACE FUNCTION public.calc_ride_ticket(_assignment_id uuid, _hours numeric, _km numeric, _waiting numeric,
  _expense_items jsonb, _correction numeric)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _rr record; _local timestamp; _hrs numeric; _billable numeric; _hourly numeric; _kmr numeric;
  _hours_amt numeric := 0; _km_amt numeric := 0; _wait_amt numeric := 0; _fixed_amt numeric := 0; _sur_pct numeric := 0;
  _sur_label text := NULL; _sur_amt numeric := 0; _exp numeric := 0; _sub numeric;
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
  SELECT COALESCE(SUM((e->>'amount')::numeric), 0) INTO _exp FROM jsonb_array_elements(COALESCE(_expense_items,'[]'::jsonb)) e;
  _sub := _hours_amt + _fixed_amt + _km_amt + _wait_amt + _sur_amt + _exp + COALESCE(_correction, 0);
  RETURN jsonb_build_object(
    'hours', _hrs, 'billable_hours', _billable, 'min_hours', COALESCE(_rr.min_hours,0), 'hourly_rate', _hourly, 'hours_amount', _hours_amt,
    'fixed_amount', _fixed_amt, 'km', COALESCE(_km,0), 'km_rate', _kmr, 'km_amount', _km_amt,
    'waiting_hours', COALESCE(_waiting,0), 'waiting_rate', COALESCE(NULLIF(_rr.waiting_rate,0), _hourly), 'waiting_amount', _wait_amt,
    'surcharge_label', _sur_label, 'surcharge_pct', _sur_pct, 'surcharge_amount', _sur_amt,
    'expenses', COALESCE(_expense_items,'[]'::jsonb), 'expenses_amount', _exp,
    'correction', COALESCE(_correction,0), 'subtotal', ROUND(_sub, 2), 'rates_source', CASE WHEN _rr IS NULL THEN 'default' ELSE 'relation' END);
END $$;

CREATE OR REPLACE FUNCTION public.submit_ride_ticket_v2(_assignment_id uuid, _hours numeric, _km numeric, _waiting_hours numeric,
  _expense_items jsonb, _correction numeric, _correction_note text, _notes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _b jsonb; _exp numeric;
BEGIN
  SELECT ra.*, r.client_id, r.pickup_city, r.dropoff_city INTO _a FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = _assignment_id;
  IF _a IS NULL OR _a.escort_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.invoiced_at IS NOT NULL OR _a.ticket_status = 'approved' THEN RAISE EXCEPTION 'Ritbon is al goedgekeurd of gefactureerd'; END IF;
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
    hours_submitted_at=now(), ticket_created_at=now(), ticket_status='submitted', ticket_reject_reason=NULL
  WHERE id=_assignment_id;
  UPDATE rides SET status='completed' WHERE id=_a.ride_id AND status <> 'cancelled';
  INSERT INTO notifications (user_id, type, title, body, ride_id, ride_assignment_id)
  VALUES (_a.client_id, 'ticket_submitted', 'Ritbon ter controle', _a.pickup_city || ' → ' || _a.dropoff_city || ': ritbon ingediend, controleer en keur goed.', _a.ride_id, _assignment_id);
  RETURN _b;
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

REVOKE ALL ON FUNCTION public.relation_id_between, public.set_relation_rates, public.calc_ride_ticket, public.submit_ride_ticket_v2 FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relation_id_between, public.set_relation_rates, public.calc_ride_ticket, public.submit_ride_ticket_v2 TO authenticated;