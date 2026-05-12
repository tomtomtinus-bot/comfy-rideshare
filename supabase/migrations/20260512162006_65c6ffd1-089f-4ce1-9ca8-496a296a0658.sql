
-- ============================================
-- 1) FIX: gevoelige velden escort_profiles afschermen
-- ============================================
-- Verwijder de policy waardoor elke ingelogde gebruiker alle kolommen kon lezen
DROP POLICY IF EXISTS "Authenticated view escorts" ON public.escort_profiles;

-- Nieuwe SELECT-policy: alleen eigenaar of admin mag direct uit de base-table lezen (gevoelige velden)
CREATE POLICY "Self or admin can read escort_profiles"
ON public.escort_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Publieke view met uitsluitend niet-gevoelige velden voor andere ingelogde gebruikers
CREATE OR REPLACE VIEW public.escort_profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  anonymous_id,
  base_city,
  base_lat,
  base_lng,
  hourly_rate,
  hourly_rate_be,
  hourly_rate_de,
  hourly_rate_fr,
  hourly_rate_lu,
  km_rate_de,
  min_billable_hours,
  rating,
  rides_completed,
  countries,
  categories,
  cert_verified_countries,
  languages,
  vehicle_type,
  vehicle_has_konvooi_sign,
  vehicle_has_lightbar,
  vehicle_has_height_pole,
  escort_types,
  available,
  company_name,
  billing_country,
  wero_enabled,
  wero_handle,
  wero_fee,
  fuel_surcharge,
  surcharges,
  cert_expires_on,
  created_at,
  updated_at
FROM public.escort_profiles;

GRANT SELECT ON public.escort_profiles_public TO authenticated;

-- ============================================
-- 2) Ontbrekende admin policies
-- ============================================
CREATE POLICY "Admins manage permit_routes"
ON public.permit_routes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin leesrechten op escort-certificates bucket
CREATE POLICY "Admins read escort certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'escort-certificates'
  AND public.has_role(auth.uid(), 'admin')
);

-- ============================================
-- 3) Function search_path fixes (warns)
-- ============================================
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.fuel_country_code(text) SET search_path = public;

-- ============================================
-- 4) Revoke EXECUTE van anonieme rol op SECURITY DEFINER functies
--    (alleen ingelogde gebruikers / service_role mogen ze aanroepen)
-- ============================================
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
      fn.schema_name, fn.func_name, fn.args
    );
  END LOOP;
END $$;
