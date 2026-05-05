REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_promote_user(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) FROM anon;