ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS discount_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS discount_reminder_sent_at timestamptz;