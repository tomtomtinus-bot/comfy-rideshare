CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Alleen admins kunnen gebruikers verwijderen';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Je kunt je eigen account niet verwijderen';
  END IF;
  -- Delete the auth user; cascading FKs (profiles, user_roles, etc.) clean up dependents
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;