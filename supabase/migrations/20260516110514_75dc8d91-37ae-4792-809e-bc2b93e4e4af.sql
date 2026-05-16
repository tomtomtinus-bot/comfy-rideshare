ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_preferences jsonb NOT NULL DEFAULT '{"weekly_updates": true}'::jsonb;