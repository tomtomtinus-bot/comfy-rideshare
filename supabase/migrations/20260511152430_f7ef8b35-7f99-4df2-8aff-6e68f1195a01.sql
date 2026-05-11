
-- 1) Bundle a set of rides under one bundle_id (client only, only own open rides)
CREATE OR REPLACE FUNCTION public.bundle_rides(_ride_ids uuid[], _label text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_bundle uuid := gen_random_uuid();
  v_count int;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _ride_ids IS NULL OR array_length(_ride_ids, 1) IS NULL OR array_length(_ride_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Selecteer minstens 2 ritten';
  END IF;
  IF _label IS NULL OR length(trim(_label)) < 2 THEN
    RAISE EXCEPTION 'Pakketnaam is verplicht';
  END IF;

  -- Validate ownership and status
  SELECT count(*) INTO v_count
    FROM public.rides
   WHERE id = ANY(_ride_ids)
     AND client_id = v_caller
     AND status IN ('open', 'matched');
  IF v_count <> array_length(_ride_ids, 1) THEN
    RAISE EXCEPTION 'Alle ritten moeten open zijn en van u';
  END IF;

  UPDATE public.rides
     SET bundle_id = v_bundle,
         bundle_label = trim(_label)
   WHERE id = ANY(_ride_ids);

  RETURN v_bundle;
END;
$$;

-- 2) Remove a single ride from its bundle
CREATE OR REPLACE FUNCTION public.unbundle_ride(_ride_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_bundle uuid;
  v_remaining int;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT bundle_id INTO v_bundle
    FROM public.rides
   WHERE id = _ride_id AND client_id = v_caller;
  IF v_bundle IS NULL THEN RETURN; END IF;

  UPDATE public.rides
     SET bundle_id = NULL,
         bundle_label = NULL
   WHERE id = _ride_id AND client_id = v_caller;

  -- If only one ride left in the bundle, dissolve it
  SELECT count(*) INTO v_remaining
    FROM public.rides
   WHERE bundle_id = v_bundle;
  IF v_remaining <= 1 THEN
    UPDATE public.rides
       SET bundle_id = NULL, bundle_label = NULL
     WHERE bundle_id = v_bundle;
  END IF;
END;
$$;

-- 3) Bundle siblings the calling escort is invited to / accepted on
CREATE OR REPLACE FUNCTION public.get_bundle_rides_for_escort(_bundle_id uuid)
RETURNS TABLE(
  ride_id uuid,
  assignment_id uuid,
  assignment_status text,
  pickup_city text,
  dropoff_city text,
  scheduled_at timestamptz,
  interest_expressed_at timestamptz,
  broadcast_closes_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id,
         ra.id,
         ra.status::text,
         r.pickup_city,
         r.dropoff_city,
         r.scheduled_at,
         ra.interest_expressed_at,
         ra.broadcast_closes_at
    FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
   WHERE r.bundle_id = _bundle_id
     AND ra.escort_id = auth.uid()
     AND ra.status IN ('invited', 'accepted')
   ORDER BY r.scheduled_at;
$$;

-- 4) Extend the escort limited view to expose bundle info
CREATE OR REPLACE FUNCTION public.get_ride_details_for_escort(_ride_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_status text;
  v_ride jsonb;
  v_client jsonb;
  v_escorts jsonb;
  v_permit jsonb;
  v_is_accepted boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT ra.status::text INTO v_status
  FROM public.ride_assignments ra
  WHERE ra.ride_id = _ride_id
    AND ra.escort_id = v_caller
  ORDER BY CASE ra.status::text WHEN 'accepted' THEN 0 WHEN 'invited' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_status IS NULL OR v_status NOT IN ('accepted', 'invited') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  v_is_accepted := (v_status = 'accepted');

  IF v_is_accepted THEN
    SELECT to_jsonb(r) INTO v_ride FROM public.rides r WHERE r.id = _ride_id;

    SELECT jsonb_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'company_name', p.company_name,
      'phone', p.phone,
      'billing_email', p.billing_email,
      'billing_contact_name', p.billing_contact_name,
      'anonymous_id', p.anonymous_id
    ) INTO v_client
    FROM public.profiles p
    WHERE p.id = (v_ride->>'client_id')::uuid;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'assignment_id', ra.id,
      'escort_id', ra.escort_id,
      'status', ra.status,
      'is_self', (ra.escort_id = v_caller),
      'anonymous_id', ep.anonymous_id,
      'full_name', CASE WHEN ra.status = 'accepted' THEN pr.full_name ELSE NULL END,
      'phone', CASE WHEN ra.status = 'accepted' THEN pr.phone ELSE NULL END,
      'base_city', ep.base_city,
      'vehicle_type', ep.vehicle_type
    ) ORDER BY ra.escort_id <> v_caller, ra.invited_at), '[]'::jsonb)
    INTO v_escorts
    FROM public.ride_assignments ra
    LEFT JOIN public.escort_profiles ep ON ep.id = ra.escort_id
    LEFT JOIN public.profiles pr ON pr.id = ra.escort_id
    WHERE ra.ride_id = _ride_id
      AND ra.status <> 'declined'
      AND ra.status <> 'cancelled';

    SELECT to_jsonb(p) INTO v_permit
    FROM public.permits p
    WHERE p.id = (v_ride->>'permit_id')::uuid;
  ELSE
    SELECT jsonb_build_object(
      'id', r.id,
      'pickup_address', r.pickup_address,
      'pickup_city', r.pickup_city,
      'pickup_lat', r.pickup_lat,
      'pickup_lng', r.pickup_lng,
      'dropoff_address', r.dropoff_address,
      'dropoff_city', r.dropoff_city,
      'dropoff_lat', r.dropoff_lat,
      'dropoff_lng', r.dropoff_lng,
      'scheduled_at', r.scheduled_at,
      'num_escorts', r.num_escorts,
      'escort_type_required', r.escort_type_required,
      'cargo_length_m', r.cargo_length_m,
      'cargo_width_m', r.cargo_width_m,
      'cargo_height_m', r.cargo_height_m,
      'cargo_weight_t', r.cargo_weight_t,
      'notes', r.notes,
      'permit_number', NULL,
      'permit_id', NULL,
      'client_reference', NULL,
      'drivers', '[]'::jsonb,
      'license_plates', '{}'::text[],
      'bundle_id', r.bundle_id,
      'bundle_label', r.bundle_label
    ) INTO v_ride
    FROM public.rides r WHERE r.id = _ride_id;

    v_client := NULL;
    v_escorts := '[]'::jsonb;
    v_permit := NULL;
  END IF;

  RETURN jsonb_build_object(
    'ride', v_ride,
    'client', v_client,
    'escorts', v_escorts,
    'permit', v_permit,
    'viewer_status', v_status
  );
END;
$function$;
