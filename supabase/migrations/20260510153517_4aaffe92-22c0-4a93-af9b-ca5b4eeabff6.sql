ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS hourly_rate_de numeric NOT NULL DEFAULT 35.00,
  ADD COLUMN IF NOT EXISTS hourly_rate_fr numeric NOT NULL DEFAULT 35.00,
  ADD COLUMN IF NOT EXISTS hourly_rate_lu numeric NOT NULL DEFAULT 35.00,
  ADD COLUMN IF NOT EXISTS km_rate_de numeric NULL;