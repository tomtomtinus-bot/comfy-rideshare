CREATE OR REPLACE FUNCTION public.get_counterparty_name(_assignment_id uuid)
RETURNS TABLE(role text, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escort uuid;
  v_client uuid;
  v_status assignment_status;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RETURN;
  END IF;

  SELECT ra.escort_id, r.client_id, ra.status
    INTO v_escort, v_client, v_status
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
   WHERE ra.id = _assignment_id;

  IF v_escort IS NULL THEN
    RETURN;
  END IF;

  -- Only reveal once accepted
  IF v_status <> 'accepted' THEN
    RETURN;
  END IF;

  IF v_caller = v_client THEN
    -- Client wants to see escort's name
    RETURN QUERY
      SELECT 'escort'::text,
             COALESCE(p.full_name, '')::text
        FROM public.profiles p
       WHERE p.id = v_escort;
  ELSIF v_caller = v_escort THEN
    -- Escort wants to see client's name (company first, then person)
    RETURN QUERY
      SELECT 'client'::text,
             COALESCE(NULLIF(p.company_name, ''), p.full_name, '')::text
        FROM public.profiles p
       WHERE p.id = v_client;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_counterparty_name(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_counterparty_name(uuid) TO authenticated;