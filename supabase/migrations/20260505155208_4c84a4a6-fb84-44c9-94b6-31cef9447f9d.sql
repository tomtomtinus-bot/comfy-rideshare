-- RPC: ritdetails voor begeleider — alleen toegankelijk als de huidige user een ACCEPTED assignment heeft op de rit
CREATE OR REPLACE FUNCTION public.get_ride_details_for_escort(_ride_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_assigned boolean;
  v_ride jsonb;
  v_client jsonb;
  v_escorts jsonb;
  v_permit jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Alleen geaccepteerde begeleiders mogen alle details zien
  SELECT EXISTS (
    SELECT 1 FROM public.ride_assignments
    WHERE ride_id = _ride_id
      AND escort_id = v_caller
      AND status = 'accepted'
  ) INTO v_is_assigned;

  IF NOT v_is_assigned THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Rit
  SELECT to_jsonb(r) INTO v_ride
  FROM public.rides r WHERE r.id = _ride_id;

  -- Opdrachtgever (chauffeur/transporteur contact)
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

  -- Alle begeleiders op deze rit (alleen geaccepteerd zichtbaar met details)
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

  -- Ontheffing
  SELECT to_jsonb(p) INTO v_permit
  FROM public.permits p
  WHERE p.id = (v_ride->>'permit_id')::uuid;

  RETURN jsonb_build_object(
    'ride', v_ride,
    'client', v_client,
    'escorts', v_escorts,
    'permit', v_permit
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ride_details_for_escort(uuid) TO authenticated;