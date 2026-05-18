ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS current_lat double precision,
  ADD COLUMN IF NOT EXISTS current_lng double precision,
  ADD COLUMN IF NOT EXISTS current_address text,
  ADD COLUMN IF NOT EXISTS current_until timestamptz;

DROP VIEW IF EXISTS public.escort_profiles_public;
CREATE VIEW public.escort_profiles_public
WITH (security_invoker = on) AS
SELECT
  id, anonymous_id, base_city, base_lat, base_lng,
  current_lat, current_lng, current_address, current_until,
  hourly_rate, hourly_rate_be, hourly_rate_de, hourly_rate_fr, hourly_rate_lu,
  km_rate_de, min_billable_hours, rating, rides_completed, countries, categories,
  cert_verified_countries, languages, vehicle_type,
  vehicle_has_konvooi_sign, vehicle_has_lightbar, vehicle_has_height_pole,
  escort_types, available, company_name, billing_country,
  wero_enabled, wero_handle, wero_fee, fuel_surcharge, surcharges,
  cert_expires_on, client_filter_mode, created_at, updated_at
FROM public.escort_profiles;
GRANT SELECT ON public.escort_profiles_public TO authenticated;