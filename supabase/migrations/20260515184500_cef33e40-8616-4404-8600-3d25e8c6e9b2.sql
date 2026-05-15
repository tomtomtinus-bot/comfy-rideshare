CREATE OR REPLACE FUNCTION public.claim_initial_role(_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _existing int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _role NOT IN ('opdrachtgever', 'begeleider') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;
  SELECT count(*) INTO _existing FROM public.user_roles WHERE user_id = _uid;
  IF _existing > 0 THEN
    RAISE EXCEPTION 'Role already assigned';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, _role);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_initial_role(public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_initial_role(public.app_role) TO authenticated;