
CREATE TABLE public.ride_swap_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  source_assignment_id uuid NOT NULL,
  source_ride_id uuid NOT NULL,
  target_ride_id uuid NOT NULL,
  target_assignment_id uuid,
  source_escort_id uuid NOT NULL,
  target_escort_id uuid,
  source_escort_decision text NOT NULL DEFAULT 'pending',
  target_escort_decision text NOT NULL DEFAULT 'n_a',
  status text NOT NULL DEFAULT 'pending',
  reason text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_swap_source_ride ON public.ride_swap_requests(source_ride_id);
CREATE INDEX idx_swap_target_ride ON public.ride_swap_requests(target_ride_id);
CREATE INDEX idx_swap_status ON public.ride_swap_requests(status);
CREATE INDEX idx_swap_source_escort ON public.ride_swap_requests(source_escort_id);
CREATE INDEX idx_swap_target_escort ON public.ride_swap_requests(target_escort_id);

ALTER TABLE public.ride_swap_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own swap requests"
  ON public.ride_swap_requests FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Involved escorts view swap requests"
  ON public.ride_swap_requests FOR SELECT TO authenticated
  USING (auth.uid() = source_escort_id OR auth.uid() = target_escort_id);

CREATE POLICY "Admins manage all swap requests"
  ON public.ride_swap_requests FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_swap_touch BEFORE UPDATE ON public.ride_swap_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============================================================
-- RPC: client creates swap request
-- ============================================================
CREATE OR REPLACE FUNCTION public.client_request_swap(
  _source_assignment_id uuid,
  _target_ride_id uuid,
  _reason text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_source_assn record;
  v_source_ride record;
  v_target_ride record;
  v_target_assn record;
  v_swap_id uuid;
  v_anon text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_source_assn FROM public.ride_assignments WHERE id = _source_assignment_id;
  IF v_source_assn.id IS NULL THEN RAISE EXCEPTION 'Bron-toewijzing niet gevonden'; END IF;
  IF v_source_assn.status <> 'accepted' THEN RAISE EXCEPTION 'Bron-toewijzing is niet geaccepteerd'; END IF;

  SELECT * INTO v_source_ride FROM public.rides WHERE id = v_source_assn.ride_id;
  IF v_source_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Niet toegestaan (bron-rit)'; END IF;
  IF v_source_ride.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Bron-rit is al afgesloten'; END IF;
  IF v_source_ride.scheduled_at < now() THEN RAISE EXCEPTION 'Bron-rit ligt in het verleden'; END IF;

  SELECT * INTO v_target_ride FROM public.rides WHERE id = _target_ride_id;
  IF v_target_ride.id IS NULL THEN RAISE EXCEPTION 'Doel-rit niet gevonden'; END IF;
  IF v_target_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Niet toegestaan (doel-rit)'; END IF;
  IF v_target_ride.status IN ('cancelled','completed') THEN RAISE EXCEPTION 'Doel-rit is al afgesloten'; END IF;
  IF v_target_ride.scheduled_at < now() THEN RAISE EXCEPTION 'Doel-rit ligt in het verleden'; END IF;
  IF v_target_ride.id = v_source_ride.id THEN RAISE EXCEPTION 'Doel-rit moet anders zijn'; END IF;

  -- Begeleider mag niet al op doel-rit zitten
  IF EXISTS (
    SELECT 1 FROM public.ride_assignments
     WHERE ride_id = _target_ride_id
       AND escort_id = v_source_assn.escort_id
       AND status IN ('invited','accepted')
  ) THEN
    RAISE EXCEPTION 'Begeleider zit al op de doel-rit';
  END IF;

  -- Geen actieve swap voor deze bron-toewijzing
  IF EXISTS (
    SELECT 1 FROM public.ride_swap_requests
     WHERE source_assignment_id = _source_assignment_id
       AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Er loopt al een verzoek voor deze begeleider';
  END IF;

  -- Bepaal doel-toewijzing (één geaccepteerde, anders open rit)
  SELECT * INTO v_target_assn
    FROM public.ride_assignments
   WHERE ride_id = _target_ride_id AND status = 'accepted'
   LIMIT 1;

  INSERT INTO public.ride_swap_requests (
    client_id, source_assignment_id, source_ride_id, target_ride_id,
    target_assignment_id, source_escort_id, target_escort_id,
    source_escort_decision, target_escort_decision, reason
  ) VALUES (
    v_caller, _source_assignment_id, v_source_ride.id, _target_ride_id,
    v_target_assn.id, v_source_assn.escort_id, v_target_assn.escort_id,
    'pending',
    CASE WHEN v_target_assn.id IS NULL THEN 'n_a' ELSE 'pending' END,
    _reason
  ) RETURNING id INTO v_swap_id;

  -- Notificatie naar bron-begeleider
  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_source_assn.escort_id, 'swap_request',
    'Verzoek tot ritwissel',
    'De opdrachtgever vraagt of je je rit ' || v_source_ride.pickup_city || ' → ' || v_source_ride.dropoff_city ||
    ' wilt wisselen voor ' || v_target_ride.pickup_city || ' → ' || v_target_ride.dropoff_city ||
    ' op ' || to_char(v_target_ride.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || '.',
    _source_assignment_id
  );

  -- Notificatie naar doel-begeleider (bij ruil)
  IF v_target_assn.id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (
      v_target_assn.escort_id, 'swap_request',
      'Verzoek tot ritwissel',
      'De opdrachtgever vraagt of je je rit ' || v_target_ride.pickup_city || ' → ' || v_target_ride.dropoff_city ||
      ' wilt wisselen voor ' || v_source_ride.pickup_city || ' → ' || v_source_ride.dropoff_city ||
      ' op ' || to_char(v_source_ride.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || '.',
      v_target_assn.id
    );
  END IF;

  RETURN v_swap_id;
END;
$$;

-- ============================================================
-- RPC: escort decides swap
-- ============================================================
CREATE OR REPLACE FUNCTION public.escort_decide_swap(
  _swap_id uuid,
  _approve boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_swap record;
  v_source_assn record;
  v_target_assn record;
  v_source_ride record;
  v_target_ride record;
  v_decision text;
  v_both_ok boolean;
  v_new_target_assn_id uuid;
  v_new_source_assn_id uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_swap FROM public.ride_swap_requests WHERE id = _swap_id;
  IF v_swap.id IS NULL THEN RAISE EXCEPTION 'Verzoek niet gevonden'; END IF;
  IF v_swap.status <> 'pending' THEN RAISE EXCEPTION 'Verzoek niet meer actief'; END IF;
  IF v_swap.expires_at < now() THEN
    UPDATE public.ride_swap_requests SET status='expired', decided_at=now() WHERE id = _swap_id;
    RAISE EXCEPTION 'Verzoek is verlopen';
  END IF;

  v_decision := CASE WHEN _approve THEN 'accepted' ELSE 'declined' END;

  IF v_caller = v_swap.source_escort_id THEN
    UPDATE public.ride_swap_requests SET source_escort_decision = v_decision WHERE id = _swap_id;
    v_swap.source_escort_decision := v_decision;
  ELSIF v_caller = v_swap.target_escort_id THEN
    UPDATE public.ride_swap_requests SET target_escort_decision = v_decision WHERE id = _swap_id;
    v_swap.target_escort_decision := v_decision;
  ELSE
    RAISE EXCEPTION 'Niet toegestaan';
  END IF;

  -- Een weigering = direct gefaald
  IF NOT _approve THEN
    UPDATE public.ride_swap_requests SET status='declined', decided_at=now() WHERE id = _swap_id;

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      v_swap.client_id, 'swap_declined',
      'Ritwissel afgewezen',
      'De begeleider heeft je verzoek tot ritwissel afgewezen.'
    );
    RETURN jsonb_build_object('status','declined');
  END IF;

  -- Beide partijen akkoord?
  v_both_ok := (v_swap.source_escort_decision = 'accepted')
           AND (v_swap.target_escort_decision IN ('accepted','n_a'));

  IF NOT v_both_ok THEN
    -- Wachten op andere begeleider
    RETURN jsonb_build_object('status','pending','waiting_for_other', true);
  END IF;

  -- ===== Voer wissel uit =====
  SELECT * INTO v_source_assn FROM public.ride_assignments WHERE id = v_swap.source_assignment_id;
  SELECT * INTO v_source_ride FROM public.rides WHERE id = v_swap.source_ride_id;
  SELECT * INTO v_target_ride FROM public.rides WHERE id = v_swap.target_ride_id;

  IF v_swap.target_assignment_id IS NOT NULL THEN
    SELECT * INTO v_target_assn FROM public.ride_assignments WHERE id = v_swap.target_assignment_id;
  END IF;

  -- Bron-toewijzing wordt geannuleerd ("verplaatst")
  UPDATE public.ride_assignments
     SET status = 'cancelled',
         cancellation_fee = 0,
         hours_notes = COALESCE(hours_notes,'') ||
           CASE WHEN COALESCE(hours_notes,'') = '' THEN '' ELSE E'\n' END ||
           'Verplaatst via ritwissel #' || _swap_id::text
   WHERE id = v_source_assn.id;

  -- Nieuwe geaccepteerde toewijzing op doel-rit voor bron-begeleider
  INSERT INTO public.ride_assignments (
    ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min, responded_at, responds_by
  ) VALUES (
    v_target_ride.id, v_source_assn.escort_id, 'accepted', 0, 0, now(), now()
  ) RETURNING id INTO v_new_target_assn_id;

  IF v_target_assn.id IS NOT NULL THEN
    -- Ruil: doel-toewijzing wordt geannuleerd, doel-begeleider verhuist naar bron-rit
    UPDATE public.ride_assignments
       SET status = 'cancelled',
           cancellation_fee = 0,
           hours_notes = COALESCE(hours_notes,'') ||
             CASE WHEN COALESCE(hours_notes,'') = '' THEN '' ELSE E'\n' END ||
             'Verplaatst via ritwissel #' || _swap_id::text
     WHERE id = v_target_assn.id;

    INSERT INTO public.ride_assignments (
      ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min, responded_at, responds_by
    ) VALUES (
      v_source_ride.id, v_target_assn.escort_id, 'accepted', 0, 0, now(), now()
    ) RETURNING id INTO v_new_source_assn_id;

    -- Bron-rit blijft matched/in_progress
    UPDATE public.rides SET status='matched' WHERE id = v_source_ride.id AND status NOT IN ('completed','cancelled','in_progress');
  ELSE
    -- Open-rit case: bron-rit wordt weer open (mits geen andere geaccepteerde begeleiders)
    IF NOT EXISTS (
      SELECT 1 FROM public.ride_assignments
       WHERE ride_id = v_source_ride.id AND status = 'accepted'
    ) THEN
      UPDATE public.rides SET status='open' WHERE id = v_source_ride.id;
    END IF;
  END IF;

  -- Doel-rit als matched markeren
  UPDATE public.rides SET status='matched' WHERE id = v_target_ride.id AND status NOT IN ('completed','cancelled','in_progress');

  UPDATE public.ride_swap_requests SET status='accepted', decided_at=now() WHERE id = _swap_id;

  -- Notificaties
  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_swap.client_id, 'swap_accepted',
    'Ritwissel uitgevoerd',
    'De begeleiders zijn geruild. Bekijk de ritten in je dashboard.',
    v_new_target_assn_id
  );

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_source_assn.escort_id, 'swap_accepted',
    'Ritwissel bevestigd',
    'Je bent verplaatst naar ' || v_target_ride.pickup_city || ' → ' || v_target_ride.dropoff_city ||
    ' op ' || to_char(v_target_ride.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || '.',
    v_new_target_assn_id
  );

  IF v_new_source_assn_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (
      v_target_assn.escort_id, 'swap_accepted',
      'Ritwissel bevestigd',
      'Je bent verplaatst naar ' || v_source_ride.pickup_city || ' → ' || v_source_ride.dropoff_city ||
      ' op ' || to_char(v_source_ride.scheduled_at AT TIME ZONE 'Europe/Amsterdam', 'DD-MM-YYYY HH24:MI') || '.',
      v_new_source_assn_id
    );
  END IF;

  RETURN jsonb_build_object('status','accepted');
END;
$$;

-- ============================================================
-- RPC: client cancels swap request
-- ============================================================
CREATE OR REPLACE FUNCTION public.client_cancel_swap(_swap_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_swap record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_swap FROM public.ride_swap_requests WHERE id = _swap_id;
  IF v_swap.id IS NULL THEN RAISE EXCEPTION 'Verzoek niet gevonden'; END IF;
  IF v_swap.client_id <> v_caller THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;
  IF v_swap.status <> 'pending' THEN RAISE EXCEPTION 'Verzoek niet meer actief'; END IF;

  UPDATE public.ride_swap_requests SET status='cancelled', decided_at=now() WHERE id = _swap_id;

  INSERT INTO public.notifications (user_id, type, title, body)
  VALUES (v_swap.source_escort_id, 'swap_cancelled', 'Ritwissel ingetrokken',
          'De opdrachtgever heeft het verzoek tot ritwissel ingetrokken.');
  IF v_swap.target_escort_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (v_swap.target_escort_id, 'swap_cancelled', 'Ritwissel ingetrokken',
            'De opdrachtgever heeft het verzoek tot ritwissel ingetrokken.');
  END IF;
END;
$$;

-- ============================================================
-- Reader: swap options for a given source assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_swap_options_for_assignment(_source_assignment_id uuid)
RETURNS TABLE(
  ride_id uuid, pickup_city text, dropoff_city text, scheduled_at timestamptz,
  status text, has_accepted_escort boolean, target_escort_anon text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_assn record;
  v_ride record;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _source_assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Niet gevonden'; END IF;
  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Niet toegestaan'; END IF;

  RETURN QUERY
  SELECT r.id, r.pickup_city, r.dropoff_city, r.scheduled_at, r.status::text,
         EXISTS (SELECT 1 FROM public.ride_assignments ra2
                  WHERE ra2.ride_id = r.id AND ra2.status = 'accepted') AS has_accepted,
         (SELECT ep.anonymous_id FROM public.ride_assignments ra3
            JOIN public.escort_profiles ep ON ep.id = ra3.escort_id
           WHERE ra3.ride_id = r.id AND ra3.status = 'accepted'
           LIMIT 1) AS target_escort_anon
    FROM public.rides r
   WHERE r.client_id = v_caller
     AND r.id <> v_ride.id
     AND r.status NOT IN ('cancelled','completed','in_progress')
     AND r.scheduled_at > now()
     AND NOT EXISTS (
       SELECT 1 FROM public.ride_assignments ra4
        WHERE ra4.ride_id = r.id AND ra4.escort_id = v_assn.escort_id
          AND ra4.status IN ('invited','accepted')
     )
   ORDER BY r.scheduled_at;
END;
$$;

-- ============================================================
-- Reader: pending swap requests for a ride (client side or escort side)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_swap_requests_for_ride(_ride_id uuid)
RETURNS TABLE(
  id uuid, source_assignment_id uuid, source_ride_id uuid, target_ride_id uuid,
  source_escort_anon text, target_escort_anon text,
  source_route text, target_route text,
  source_scheduled_at timestamptz, target_scheduled_at timestamptz,
  source_decision text, target_decision text, status text,
  reason text, expires_at timestamptz, created_at timestamptz,
  is_source_side boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY
  SELECT s.id, s.source_assignment_id, s.source_ride_id, s.target_ride_id,
         eps.anonymous_id, ept.anonymous_id,
         (rs.pickup_city || ' → ' || rs.dropoff_city),
         (rt.pickup_city || ' → ' || rt.dropoff_city),
         rs.scheduled_at, rt.scheduled_at,
         s.source_escort_decision, s.target_escort_decision, s.status,
         s.reason, s.expires_at, s.created_at,
         (s.source_ride_id = _ride_id) AS is_source_side
    FROM public.ride_swap_requests s
    JOIN public.rides rs ON rs.id = s.source_ride_id
    JOIN public.rides rt ON rt.id = s.target_ride_id
    LEFT JOIN public.escort_profiles eps ON eps.id = s.source_escort_id
    LEFT JOIN public.escort_profiles ept ON ept.id = s.target_escort_id
   WHERE (s.source_ride_id = _ride_id OR s.target_ride_id = _ride_id)
     AND s.status = 'pending'
     AND (
       s.client_id = v_caller
       OR s.source_escort_id = v_caller
       OR s.target_escort_id = v_caller
       OR has_role(v_caller, 'admin'::app_role)
     );
END;
$$;
