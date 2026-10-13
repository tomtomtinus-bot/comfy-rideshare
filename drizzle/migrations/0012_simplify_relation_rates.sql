ALTER TABLE public.relation_rates ADD COLUMN IF NOT EXISTS min_amount numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.set_relation_rates_v2(_relation_id uuid, _hourly numeric, _min_amount numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'begeleider') THEN RAISE EXCEPTION 'Alleen de begeleider kan tarieven instellen'; END IF;
  IF NOT EXISTS (SELECT 1 FROM relations WHERE id=_relation_id AND status IN ('accepted','pending') AND auth.uid() IN (requester_id, addressee_id)) THEN
    RAISE EXCEPTION 'Alleen deelnemers van deze relatie kunnen tarieven instellen'; END IF;
  IF COALESCE(_hourly,0) NOT BETWEEN 0 AND 1000 OR COALESCE(_min_amount,0) NOT BETWEEN 0 AND 20000 THEN RAISE EXCEPTION 'Ongeldige tariefwaarden'; END IF;
  INSERT INTO relation_rates (relation_id, hourly_rate, km_rate, min_hours, min_amount, waiting_rate, night_pct, weekend_pct, holiday_pct, updated_at, updated_by)
  VALUES (_relation_id, COALESCE(_hourly,0), 0, 0, COALESCE(_min_amount,0), 0, 0, 0, 0, now(), auth.uid())
  ON CONFLICT (relation_id) DO UPDATE SET hourly_rate=EXCLUDED.hourly_rate, km_rate=0, min_hours=0, min_amount=EXCLUDED.min_amount,
    waiting_rate=0, night_pct=0, weekend_pct=0, holiday_pct=0, updated_at=now(), updated_by=auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.set_relation_rates_v2(uuid, numeric, numeric) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_relation_rates_v2(uuid, numeric, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.calc_ride_ticket(_assignment_id uuid, _hours numeric, _km numeric, _waiting numeric, _expense_items jsonb, _correction numeric)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _a record; _rr record; _hrs numeric; _billable numeric; _hourly numeric; _kmr numeric; _min_amt numeric := 0;
  _hours_amt numeric := 0; _km_amt numeric := 0; _wait_amt numeric := 0; _fixed_amt numeric := 0;
  _sur_amt numeric := 0; _surs jsonb := '[]'::jsonb; _fuel numeric := 0; _exp numeric := 0; _exps jsonb := '[]'::jsonb; _sub numeric; e jsonb;
  _sh numeric; _sp numeric; _sa numeric;
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
  _min_amt := COALESCE(_rr.min_amount, 0);
  IF _a.rate_type = 'fixed' THEN
    _fixed_amt := COALESCE(_a.rate_amount, 0); _billable := _hrs; _min_amt := 0;
  ELSE
    _hours_amt := ROUND(GREATEST(_billable * _hourly, _min_amt), 2);
  END IF;
  _km_amt := ROUND(COALESCE(_km,0) * _kmr, 2);
  _wait_amt := ROUND(COALESCE(_waiting,0) * _hourly, 2);
  FOR e IN SELECT * FROM jsonb_array_elements(COALESCE(_expense_items,'[]'::jsonb)) LOOP
    IF e->>'kind' = 'surcharge' THEN
      _sh := COALESCE(NULLIF(e->>'hours','')::numeric, 0); _sp := COALESCE(NULLIF(e->>'pct','')::numeric, 0);
      IF _sh NOT BETWEEN 0 AND 48 OR _sp NOT BETWEEN 0 AND 300 THEN RAISE EXCEPTION 'Ongeldige toeslag'; END IF;
      _sa := ROUND(_sh * _hourly * _sp / 100, 2);
      _sur_amt := _sur_amt + _sa;
      _surs := _surs || jsonb_build_array(jsonb_build_object('kind','surcharge','description', COALESCE(NULLIF(e->>'description',''),'Toeslag'), 'hours', _sh, 'pct', _sp, 'amount', _sa));
    ELSE
      _exp := _exp + COALESCE((e->>'amount')::numeric, 0);
      _exps := _exps || jsonb_build_array(e);
    END IF;
  END LOOP;
  _fuel := COALESCE(compute_fuel_surcharge(_a.escort_id, _a.scheduled_at, _billable, _hours_amt + _fixed_amt), 0);
  _sub := _hours_amt + _fixed_amt + _km_amt + _wait_amt + _sur_amt + _fuel + _exp + COALESCE(_correction, 0);
  RETURN jsonb_build_object(
    'hours', _hrs, 'billable_hours', _billable, 'min_hours', COALESCE(_rr.min_hours,0), 'min_amount', _min_amt, 'hourly_rate', _hourly, 'hours_amount', _hours_amt,
    'fixed_amount', _fixed_amt, 'km', COALESCE(_km,0), 'km_rate', _kmr, 'km_amount', _km_amt,
    'waiting_hours', COALESCE(_waiting,0), 'waiting_rate', _hourly, 'waiting_amount', _wait_amt,
    'surcharge_label', CASE WHEN _sur_amt > 0 THEN 'Toeslagen' END, 'surcharge_pct', 0, 'surcharge_amount', _sur_amt, 'surcharges', _surs,
    'fuel_amount', _fuel, 'expenses', _exps, 'expenses_amount', _exp,
    'correction', COALESCE(_correction,0), 'subtotal', ROUND(_sub, 2), 'rates_source', CASE WHEN _rr IS NULL THEN 'default' ELSE 'relation' END);
END $function$;