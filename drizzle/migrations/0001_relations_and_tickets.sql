CREATE TABLE public.relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);
GRANT SELECT, DELETE ON public.relations TO authenticated;
GRANT ALL ON public.relations TO service_role;
ALTER TABLE public.relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read relations" ON public.relations FOR SELECT TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id));
CREATE POLICY "Participants delete relations" ON public.relations FOR DELETE TO authenticated
  USING (auth.uid() IN (requester_id, addressee_id));

CREATE OR REPLACE FUNCTION public.is_relation(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM relations WHERE status = 'accepted'
    AND ((requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)));
$$;

CREATE OR REPLACE FUNCTION public.add_relation(_query text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _me_escort boolean; _target uuid; _q text := lower(trim(_query));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF length(_q) < 3 THEN RAISE EXCEPTION 'Vul een e-mailadres of bedrijfsnaam in'; END IF;
  _me_escort := has_role(_uid, 'begeleider');
  SELECT u.id INTO _target FROM auth.users u
   WHERE lower(u.email) = _q AND u.id <> _uid
     AND has_role(u.id, CASE WHEN _me_escort THEN 'opdrachtgever'::app_role ELSE 'begeleider'::app_role END)
   LIMIT 1;
  IF _target IS NULL THEN
    SELECT p.id INTO _target FROM profiles p LEFT JOIN escort_profiles ep ON ep.id = p.id
     WHERE (lower(p.company_name) = _q OR lower(ep.company_name) = _q) AND p.id <> _uid
       AND has_role(p.id, CASE WHEN _me_escort THEN 'opdrachtgever'::app_role ELSE 'begeleider'::app_role END)
     LIMIT 1;
  END IF;
  IF _target IS NULL THEN RAISE EXCEPTION 'Geen %-account gevonden met dit e-mailadres of deze bedrijfsnaam', CASE WHEN _me_escort THEN 'planner' ELSE 'begeleider' END; END IF;
  IF EXISTS (SELECT 1 FROM relations WHERE (requester_id=_uid AND addressee_id=_target) OR (requester_id=_target AND addressee_id=_uid)) THEN
    UPDATE relations SET status='accepted', responded_at=now()
     WHERE requester_id=_target AND addressee_id=_uid AND status='pending';
    RETURN 'exists';
  END IF;
  INSERT INTO relations (requester_id, addressee_id) VALUES (_uid, _target);
  INSERT INTO notifications (user_id, type, title, body)
  VALUES (_target, 'relation_request', 'Nieuw relatieverzoek', 'Iemand wil je toevoegen als vaste relatie in ViaCust.');
  RETURN 'requested';
END $$;

CREATE OR REPLACE FUNCTION public.respond_relation(_id uuid, _accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE relations SET status = CASE WHEN _accept THEN 'accepted' ELSE 'declined' END, responded_at = now()
   WHERE id = _id AND addressee_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Verzoek niet gevonden'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.list_relations()
RETURNS TABLE(id uuid, other_id uuid, name text, email text, status text, incoming boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, o.oid,
    COALESCE(NULLIF(ep.company_name,''), NULLIF(p.company_name,''), p.full_name, p.anonymous_id, 'Onbekend'),
    CASE WHEN r.status = 'accepted' THEN u.email::text END,
    r.status, r.addressee_id = auth.uid(), r.created_at
  FROM relations r
  CROSS JOIN LATERAL (SELECT CASE WHEN r.requester_id = auth.uid() THEN r.addressee_id ELSE r.requester_id END AS oid) o
  LEFT JOIN profiles p ON p.id = o.oid
  LEFT JOIN escort_profiles ep ON ep.id = o.oid
  LEFT JOIN auth.users u ON u.id = o.oid
  WHERE auth.uid() IN (r.requester_id, r.addressee_id) AND r.status <> 'declined'
  ORDER BY r.created_at DESC;
$$;

ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS rate_type text CHECK (rate_type IN ('hourly','km','fixed'));
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS rate_amount numeric;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS client_google_event_id text;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_waiting_hours numeric;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_expenses numeric;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_expenses_note text;
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_status text NOT NULL DEFAULT 'none';
ALTER TABLE public.ride_assignments ADD COLUMN IF NOT EXISTS ticket_reject_reason text;

CREATE OR REPLACE FUNCTION public.create_relation_ride(
  _pickup_address text, _pickup_city text, _pickup_lat double precision, _pickup_lng double precision,
  _dropoff_address text, _dropoff_city text, _dropoff_lat double precision, _dropoff_lng double precision,
  _scheduled_at timestamptz, _permit_number text, _client_reference text, _notes text,
  _length_m numeric, _width_m numeric, _height_m numeric, _weight_t numeric, _plates text[],
  _rate_type text, _rate_amount numeric, _counterparty uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _client uuid; _escort uuid; _ride uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF _rate_type IS NOT NULL AND _rate_type NOT IN ('hourly','km','fixed') THEN RAISE EXCEPTION 'Ongeldig tarieftype'; END IF;
  IF _rate_amount IS NOT NULL AND (_rate_amount < 0 OR _rate_amount > 100000) THEN RAISE EXCEPTION 'Ongeldig tarief'; END IF;
  IF has_role(_uid, 'begeleider') THEN
    IF _counterparty IS NULL THEN RAISE EXCEPTION 'Kies een planner'; END IF;
    _client := _counterparty; _escort := _uid;
  ELSE
    _client := _uid; _escort := _counterparty;
  END IF;
  IF _counterparty IS NOT NULL AND NOT is_relation(_uid, _counterparty) THEN
    RAISE EXCEPTION 'Deze persoon is (nog) geen vaste relatie';
  END IF;
  INSERT INTO rides (client_id, pickup_address, pickup_city, pickup_lat, pickup_lng,
    dropoff_address, dropoff_city, dropoff_lat, dropoff_lng, scheduled_at, num_escorts,
    permit_number, client_reference, notes, cargo_length_m, cargo_width_m, cargo_height_m, cargo_weight_t,
    license_plates, rate_type, rate_amount, status)
  VALUES (_client, _pickup_address, _pickup_city, _pickup_lat, _pickup_lng,
    _dropoff_address, _dropoff_city, _dropoff_lat, _dropoff_lng, _scheduled_at, 1,
    NULLIF(_permit_number,''), NULLIF(_client_reference,''), NULLIF(_notes,''), _length_m, _width_m, _height_m, _weight_t,
    COALESCE(_plates, '{}'), _rate_type, _rate_amount,
    CASE WHEN _escort IS NULL THEN 'open'::ride_status ELSE 'matched'::ride_status END)
  RETURNING id INTO _ride;
  IF _escort IS NOT NULL THEN
    INSERT INTO ride_assignments (ride_id, escort_id, status, invited_at, responds_by, responded_at, travel_to_pickup_min, travel_back_home_min)
    VALUES (_ride, _escort, 'accepted', now(), now(), now(), 0, 0);
    INSERT INTO notifications (user_id, type, title, body, ride_id)
    VALUES (CASE WHEN _uid = _client THEN _escort ELSE _client END, 'ride_assigned', 'Nieuwe rit toegewezen',
      _pickup_city || ' → ' || _dropoff_city || ' op ' || to_char(_scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI'), _ride);
  END IF;
  RETURN _ride;
END $$;

CREATE OR REPLACE FUNCTION public.mark_ride_completed(_ride_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_ride_client(_ride_id) OR EXISTS (SELECT 1 FROM ride_assignments WHERE ride_id=_ride_id AND escort_id=auth.uid() AND status='accepted')) THEN
    RAISE EXCEPTION 'Geen toegang';
  END IF;
  UPDATE rides SET status='completed' WHERE id=_ride_id AND status <> 'cancelled';
END $$;

CREATE OR REPLACE FUNCTION public.submit_ride_ticket(_assignment_id uuid, _hours numeric, _km numeric,
  _waiting_hours numeric, _expenses numeric, _expenses_note text, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record; _amount numeric; _rate numeric;
BEGIN
  SELECT ra.*, r.client_id, r.rate_type, r.rate_amount, r.pickup_city, r.dropoff_city INTO _a
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = _assignment_id;
  IF _a IS NULL OR _a.escort_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.invoiced_at IS NOT NULL OR _a.ticket_status = 'approved' THEN RAISE EXCEPTION 'Ritbon is al goedgekeurd of gefactureerd'; END IF;
  IF _hours IS NULL OR _hours < 0 OR _hours > 48 THEN RAISE EXCEPTION 'Ongeldig aantal uren'; END IF;
  IF COALESCE(_km,0) < 0 OR COALESCE(_km,0) > 5000 THEN RAISE EXCEPTION 'Ongeldig aantal kilometers'; END IF;
  IF COALESCE(_waiting_hours,0) < 0 OR COALESCE(_waiting_hours,0) > 48 THEN RAISE EXCEPTION 'Ongeldige wachturen'; END IF;
  IF COALESCE(_expenses,0) < 0 OR COALESCE(_expenses,0) > 10000 THEN RAISE EXCEPTION 'Ongeldige onkosten'; END IF;
  SELECT hourly_rate INTO _rate FROM escort_profiles WHERE id = _a.escort_id;
  _amount := CASE COALESCE(_a.rate_type,'hourly')
    WHEN 'km' THEN COALESCE(_km,0) * COALESCE(_a.rate_amount,0)
    WHEN 'fixed' THEN COALESCE(_a.rate_amount,0)
    ELSE (_hours + COALESCE(_waiting_hours,0)) * COALESCE(_a.rate_amount, _rate, 0) END;
  UPDATE ride_assignments SET actual_hours=_hours, ticket_km=_km, ticket_waiting_hours=_waiting_hours,
    ticket_expenses=_expenses, ticket_expenses_note=NULLIF(_expenses_note,''), hours_notes=NULLIF(_notes,''),
    extra_costs_total = COALESCE(_expenses,0),
    actual_cost = ROUND(_amount + COALESCE(_expenses,0), 2),
    hours_submitted_at = now(), ticket_created_at = now(), ticket_status='submitted', ticket_reject_reason=NULL
  WHERE id = _assignment_id;
  UPDATE rides SET status='completed' WHERE id=_a.ride_id AND status <> 'cancelled';
  INSERT INTO notifications (user_id, type, title, body, ride_id, ride_assignment_id)
  VALUES (_a.client_id, 'ticket_submitted', 'Ritbon ter controle', _a.pickup_city || ' → ' || _a.dropoff_city || ': ritbon ingediend, controleer en keur goed.', _a.ride_id, _assignment_id);
END $$;

CREATE OR REPLACE FUNCTION public.review_ride_ticket(_assignment_id uuid, _approve boolean, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _a record;
BEGIN
  SELECT ra.*, r.client_id, r.pickup_city, r.dropoff_city INTO _a FROM ride_assignments ra JOIN rides r ON r.id=ra.ride_id WHERE ra.id=_assignment_id;
  IF _a IS NULL OR _a.client_id <> auth.uid() THEN RAISE EXCEPTION 'Geen toegang'; END IF;
  IF _a.ticket_status <> 'submitted' THEN RAISE EXCEPTION 'Er is geen ritbon ter controle'; END IF;
  UPDATE ride_assignments SET ticket_status = CASE WHEN _approve THEN 'approved' ELSE 'rejected' END,
    ticket_reject_reason = CASE WHEN _approve THEN NULL ELSE NULLIF(_reason,'') END,
    hours_approved_at = CASE WHEN _approve THEN now() END, hours_approved_by = CASE WHEN _approve THEN auth.uid() END
  WHERE id=_assignment_id;
  INSERT INTO notifications (user_id, type, title, body, ride_id, ride_assignment_id)
  VALUES (_a.escort_id, 'ticket_reviewed', CASE WHEN _approve THEN 'Ritbon goedgekeurd' ELSE 'Ritbon afgekeurd' END,
    _a.pickup_city || ' → ' || _a.dropoff_city || COALESCE(': ' || NULLIF(_reason,''), ''), _a.ride_id, _assignment_id);
END $$;

CREATE OR REPLACE FUNCTION public.invoice_selected_tickets(_assignment_ids uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec record; _inv uuid; _n int := 0;
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
    INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT _inv, ra.id, ra.ride_id, r.scheduled_at, ra.actual_hours + COALESCE(ra.ticket_waiting_hours,0),
      CASE WHEN COALESCE(r.rate_type,'hourly') = 'hourly' THEN COALESCE(r.rate_amount, 0) ELSE 0 END,
      ROUND(COALESCE(ra.actual_cost,0) - COALESCE(ra.ticket_expenses,0), 2),
      COALESCE(r.ride_number || ' · ', '') || r.pickup_city || ' → ' || r.dropoff_city
        || COALESCE(' · dossier ' || r.permit_number, '')
        || COALESCE(' · ' || ra.ticket_km || ' km', '')
        || COALESCE(' · ' || NULLIF(ra.ticket_waiting_hours,0) || ' wachturen', '')
        || CASE r.rate_type WHEN 'km' THEN ' · kilometertarief' WHEN 'fixed' THEN ' · vaste prijs' ELSE '' END
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id WHERE ra.id = ANY(rec.ids);
    INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT _inv, ra.id, ra.ride_id, r.scheduled_at, 0, 0, ROUND(ra.ticket_expenses,2),
      'Onkosten ' || r.pickup_city || ' → ' || r.dropoff_city || COALESCE(': ' || ra.ticket_expenses_note, '')
    FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(rec.ids) AND COALESCE(ra.ticket_expenses,0) > 0;
    UPDATE ride_assignments SET invoiced_at = now(), invoice_id = _inv WHERE id = ANY(rec.ids);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.add_relation, public.respond_relation, public.list_relations, public.is_relation,
  public.create_relation_ride, public.mark_ride_completed, public.submit_ride_ticket, public.review_ride_ticket FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_relation, public.respond_relation, public.list_relations, public.is_relation,
  public.create_relation_ride, public.mark_ride_completed, public.submit_ride_ticket, public.review_ride_ticket TO authenticated;