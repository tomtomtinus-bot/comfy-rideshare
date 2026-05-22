
-- Security hardening: lock down function execution
-- 1) Block ALL public-schema functions for anonymous (unauthenticated) callers.
--    RLS helper functions stay callable by authenticated users (RLS evaluates them in user context).
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, PUBLIC;

-- 2) Lock internal/admin-only functions away from regular signed-in users too.
--    They self-check admin role or run server-side cron, so authenticated end users have no business calling them via PostgREST.
DO $$
DECLARE
  fn record;
  internal_names text[] := ARRAY[
    'admin_set_cert_verified_countries',
    'admin_revoke_admin',
    'admin_approve_user',
    'admin_reject_user',
    'admin_set_role',
    'admin_promote_user',
    'admin_list_users',
    'generate_weekly_invoices',
    'generate_platform_invoices',
    'enqueue_email',
    'read_email_batch',
    'delete_email',
    'move_to_dlq',
    'set_escort_invoice_number',
    'set_platform_invoice_number',
    'notifications_fill_ride_id',
    'notify_new_message',
    'touch_updated_at',
    'auto_cleanup_permit_after_ride',
    'next_invoice_number'
  ];
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY(internal_names)
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
                   fn.nspname, fn.proname, fn.args);
  END LOOP;
END $$;
