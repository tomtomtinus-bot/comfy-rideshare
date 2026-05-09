ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS wero_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wero_handle text,
  ADD COLUMN IF NOT EXISTS wero_fee numeric NOT NULL DEFAULT 0;