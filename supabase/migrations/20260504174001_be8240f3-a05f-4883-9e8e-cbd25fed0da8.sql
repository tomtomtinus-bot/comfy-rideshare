ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS extra_costs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS extra_costs_total numeric NOT NULL DEFAULT 0;