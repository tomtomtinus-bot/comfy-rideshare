ALTER TABLE public.escort_profiles
ADD COLUMN IF NOT EXISTS sms_notifications_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_opt_in_at timestamptz;