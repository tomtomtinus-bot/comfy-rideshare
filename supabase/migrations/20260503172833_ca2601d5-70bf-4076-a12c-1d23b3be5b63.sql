
ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS base_address text,
  ADD COLUMN IF NOT EXISTS base_postcode text;
