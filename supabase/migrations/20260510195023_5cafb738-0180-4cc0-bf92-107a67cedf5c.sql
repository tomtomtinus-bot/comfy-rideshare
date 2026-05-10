ALTER TABLE public.escort_profiles
DROP COLUMN IF EXISTS sms_notifications_enabled,
DROP COLUMN IF EXISTS sms_opt_in_at;