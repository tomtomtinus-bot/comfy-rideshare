
ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS fuel_surcharge JSONB NOT NULL DEFAULT '{"enabled": false, "kind": "per_uur", "tiers": []}'::jsonb;
