GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_promote_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_user(uuid, text) TO authenticated;