-- Begeleider: convoi exceptionnel velden
ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT ARRAY['cat-1']::TEXT[],
  ADD COLUMN IF NOT EXISTS escort_types TEXT[] NOT NULL DEFAULT ARRAY['vooroprijden']::TEXT[],
  ADD COLUMN IF NOT EXISTS vehicle_type TEXT NOT NULL DEFAULT 'Bestelwagen',
  ADD COLUMN IF NOT EXISTS vehicle_has_height_pole BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vehicle_has_lightbar BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS vehicle_has_konvooi_sign BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cert_number TEXT,
  ADD COLUMN IF NOT EXISTS cert_expires_on DATE,
  ADD COLUMN IF NOT EXISTS vca_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy TEXT;

-- Rides: convoi exceptionnel velden
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS cargo_length_m NUMERIC,
  ADD COLUMN IF NOT EXISTS cargo_width_m NUMERIC,
  ADD COLUMN IF NOT EXISTS cargo_height_m NUMERIC,
  ADD COLUMN IF NOT EXISTS cargo_weight_t NUMERIC,
  ADD COLUMN IF NOT EXISTS permit_number TEXT,
  ADD COLUMN IF NOT EXISTS time_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escort_type_required TEXT NOT NULL DEFAULT 'vooroprijden';