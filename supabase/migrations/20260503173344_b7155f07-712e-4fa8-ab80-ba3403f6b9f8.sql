
ALTER TABLE public.escort_availability
  ADD COLUMN IF NOT EXISTS date date,
  ALTER COLUMN weekday DROP NOT NULL;
