ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS cert_verified_countries text[] NOT NULL DEFAULT '{}'::text[];

CREATE OR REPLACE FUNCTION public.admin_set_cert_verified_countries(_escort_id uuid, _countries text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.escort_profiles
     SET cert_verified_countries = COALESCE(_countries, '{}'::text[])
   WHERE id = _escort_id;
END;
$$;

-- Update get_ride_details_for_client to include verified countries + languages
CREATE OR REPLACE FUNCTION public.get_ride_details_for_client(_ride_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_owner boolean;
  v_ride jsonb;
  v_escorts jsonb;
  v_permit jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.rides WHERE id = _ride_id AND client_id = v_caller
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT to_jsonb(r) INTO v_ride
  FROM public.rides r WHERE r.id = _ride_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'assignment_id', ra.id,
    'escort_id', ra.escort_id,
    'status', ra.status,
    'anonymous_id', ep.anonymous_id,
    'full_name', CASE WHEN ra.status = 'accepted' THEN pr.full_name ELSE NULL END,
    'phone', CASE WHEN ra.status = 'accepted' THEN pr.phone ELSE NULL END,
    'base_city', ep.base_city,
    'vehicle_type', ep.vehicle_type,
    'cert_verified_countries', ep.cert_verified_countries,
    'languages', ep.languages
  ) ORDER BY ra.invited_at), '[]'::jsonb)
  INTO v_escorts
  FROM public.ride_assignments ra
  LEFT JOIN public.escort_profiles ep ON ep.id = ra.escort_id
  LEFT JOIN public.profiles pr ON pr.id = ra.escort_id
  WHERE ra.ride_id = _ride_id;

  SELECT to_jsonb(p) INTO v_permit
  FROM public.permits p
  WHERE p.id = (v_ride->>'permit_id')::uuid;

  RETURN jsonb_build_object(
    'ride', v_ride,
    'escorts', v_escorts,
    'permit', v_permit
  );
END;
$function$;