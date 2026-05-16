ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS push_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_expired_sent_at timestamptz;