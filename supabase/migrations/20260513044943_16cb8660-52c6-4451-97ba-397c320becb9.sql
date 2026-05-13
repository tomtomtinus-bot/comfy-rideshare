ALTER TABLE public.escort_profiles
ADD COLUMN IF NOT EXISTS self_billing_mandate_accepted_at timestamp with time zone;