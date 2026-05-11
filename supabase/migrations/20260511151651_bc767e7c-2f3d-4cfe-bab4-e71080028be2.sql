
ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS interest_expressed_at timestamptz,
  ADD COLUMN IF NOT EXISTS interest_score numeric,
  ADD COLUMN IF NOT EXISTS broadcast_closes_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ride_assignments_broadcast_closes_at
  ON public.ride_assignments(broadcast_closes_at)
  WHERE broadcast_closes_at IS NOT NULL AND status = 'invited';

ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS bundle_id uuid,
  ADD COLUMN IF NOT EXISTS bundle_label text;

CREATE INDEX IF NOT EXISTS idx_rides_bundle_id ON public.rides(bundle_id) WHERE bundle_id IS NOT NULL;
