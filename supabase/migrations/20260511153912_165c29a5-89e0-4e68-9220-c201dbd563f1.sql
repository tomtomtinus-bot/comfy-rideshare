
-- Bundle redesign: open-for-extension flag + 1-on-1 priority offers
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS bundle_open_for_extension boolean NOT NULL DEFAULT false;

ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS bundle_priority_offer boolean NOT NULL DEFAULT false;

-- Seed priority 1-on-1 invitations for a newly created bundle-ride.
-- Targets every escort that has an 'accepted' assignment in the same bundle
-- (across other rides). Caller must be the ride's client.
CREATE OR REPLACE FUNCTION public.create_priority_assignments_for_bundle_ride(_ride_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_ride record;
  v_escort_id uuid;
  v_count int := 0;
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_dropoff_lat double precision;
  v_dropoff_lng double precision;
  v_anon text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;
  IF v_ride.client_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF v_ride.bundle_id IS NULL THEN RAISE EXCEPTION 'Rit zit niet in een pakket'; END IF;

  v_pickup_lat := v_ride.pickup_lat;
  v_pickup_lng := v_ride.pickup_lng;
  v_dropoff_lat := v_ride.dropoff_lat;
  v_dropoff_lng := v_ride.dropoff_lng;

  FOR v_escort_id IN
    SELECT DISTINCT ra.escort_id
      FROM public.ride_assignments ra
      JOIN public.rides r ON r.id = ra.ride_id
     WHERE r.bundle_id = v_ride.bundle_id
       AND r.id <> _ride_id
       AND ra.status = 'accepted'
  LOOP
    -- Skip if this escort already has an assignment for this ride
    IF EXISTS (SELECT 1 FROM public.ride_assignments WHERE ride_id = _ride_id AND escort_id = v_escort_id) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.ride_assignments (
      ride_id, escort_id, status,
      travel_to_pickup_min, travel_back_home_min,
      bundle_priority_offer,
      responds_by
    ) VALUES (
      _ride_id, v_escort_id, 'invited',
      0, 0,
      true,
      now() + interval '30 minutes'
    );

    SELECT anonymous_id INTO v_anon FROM public.escort_profiles WHERE id = v_escort_id;

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (
      v_escort_id,
      'bundle_priority_offer',
      'Vervolgrit binnen pakket',
      'U krijgt 30 minuten voorrang op een nieuwe rit binnen pakket "' ||
      COALESCE(v_ride.bundle_label, 'pakket') || '": ' ||
      v_ride.pickup_city || ' → ' || v_ride.dropoff_city || '.',
      (SELECT id FROM public.ride_assignments
        WHERE ride_id = _ride_id AND escort_id = v_escort_id
        ORDER BY created_at DESC LIMIT 1)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Escort accepts a 1-on-1 bundle priority offer (instant, no 5-min broadcast).
CREATE OR REPLACE FUNCTION public.accept_bundle_priority_offer(_assignment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_assn record;
  v_ride record;
  v_anon text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.escort_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT v_assn.bundle_priority_offer THEN RAISE EXCEPTION 'Geen pakket-aanbod'; END IF;
  IF v_assn.status <> 'invited' THEN RAISE EXCEPTION 'Aanbod niet meer beschikbaar'; END IF;
  IF v_assn.responds_by < now() THEN RAISE EXCEPTION 'Aanbod is verlopen'; END IF;

  UPDATE public.ride_assignments
     SET status = 'accepted', responded_at = now()
   WHERE id = _assignment_id;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  SELECT anonymous_id INTO v_anon FROM public.escort_profiles WHERE id = v_caller;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_ride.client_id,
    'bundle_priority_accepted',
    'Vervolgrit geaccepteerd',
    'Begeleider #' || COALESCE(v_anon, '????') || ' accepteerde de vervolgrit ' ||
    v_ride.pickup_city || ' → ' || v_ride.dropoff_city || ' binnen pakket "' ||
    COALESCE(v_ride.bundle_label, 'pakket') || '".',
    _assignment_id
  );
END;
$$;

-- Escort declines a 1-on-1 bundle priority offer (does NOT affect their other accepted rides).
CREATE OR REPLACE FUNCTION public.decline_bundle_priority_offer(_assignment_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_assn record;
  v_ride record;
  v_anon text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_assn FROM public.ride_assignments WHERE id = _assignment_id;
  IF v_assn.id IS NULL THEN RAISE EXCEPTION 'Assignment not found'; END IF;
  IF v_assn.escort_id <> v_caller THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NOT v_assn.bundle_priority_offer THEN RAISE EXCEPTION 'Geen pakket-aanbod'; END IF;
  IF v_assn.status <> 'invited' THEN RAISE EXCEPTION 'Aanbod niet meer beschikbaar'; END IF;

  UPDATE public.ride_assignments
     SET status = 'declined', responded_at = now()
   WHERE id = _assignment_id;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_assn.ride_id;
  SELECT anonymous_id INTO v_anon FROM public.escort_profiles WHERE id = v_caller;

  INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
  VALUES (
    v_ride.client_id,
    'bundle_priority_declined',
    'Vervolgrit geweigerd',
    'Begeleider #' || COALESCE(v_anon, '????') || ' weigerde de vervolgrit ' ||
    v_ride.pickup_city || ' → ' || v_ride.dropoff_city ||
    CASE WHEN _reason IS NOT NULL AND length(trim(_reason)) > 0
         THEN ' — reden: ' || _reason ELSE '' END ||
    '. De andere ritten van deze begeleider blijven staan.',
    _assignment_id
  );
END;
$$;
