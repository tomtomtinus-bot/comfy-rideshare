ALTER TABLE public.escort_profiles
ADD COLUMN IF NOT EXISTS min_billable_hours numeric NOT NULL DEFAULT 0;