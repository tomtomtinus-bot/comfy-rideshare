
ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS client_filter_mode text NOT NULL DEFAULT 'all';
ALTER TABLE public.escort_profiles
  DROP CONSTRAINT IF EXISTS escort_profiles_client_filter_mode_check;
ALTER TABLE public.escort_profiles
  ADD CONSTRAINT escort_profiles_client_filter_mode_check
  CHECK (client_filter_mode IN ('all','only','except'));

CREATE TABLE IF NOT EXISTS public.escort_preferred_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escort_id uuid NOT NULL,
  client_id uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escort_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_escort_preferred_clients_escort
  ON public.escort_preferred_clients(escort_id);
CREATE INDEX IF NOT EXISTS idx_escort_preferred_clients_client
  ON public.escort_preferred_clients(client_id);
ALTER TABLE public.escort_preferred_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Escort manages own preferred clients" ON public.escort_preferred_clients;
CREATE POLICY "Escort manages own preferred clients"
  ON public.escort_preferred_clients FOR ALL TO authenticated
  USING (auth.uid() = escort_id) WITH CHECK (auth.uid() = escort_id);

DROP POLICY IF EXISTS "Admins manage all preferred clients" ON public.escort_preferred_clients;
CREATE POLICY "Admins manage all preferred clients"
  ON public.escort_preferred_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recreate view (drop first to allow column reorder)
DROP VIEW IF EXISTS public.escort_profiles_public;
CREATE VIEW public.escort_profiles_public
WITH (security_invoker = on) AS
SELECT
  id, anonymous_id, base_city, base_lat, base_lng,
  hourly_rate, hourly_rate_be, hourly_rate_de, hourly_rate_fr, hourly_rate_lu,
  km_rate_de, min_billable_hours, rating, rides_completed, countries, categories,
  cert_verified_countries, languages, vehicle_type,
  vehicle_has_konvooi_sign, vehicle_has_lightbar, vehicle_has_height_pole,
  escort_types, available, company_name, billing_country,
  wero_enabled, wero_handle, wero_fee, fuel_surcharge, surcharges,
  cert_expires_on, client_filter_mode, created_at, updated_at
FROM public.escort_profiles;
GRANT SELECT ON public.escort_profiles_public TO authenticated;

CREATE OR REPLACE FUNCTION public.escort_eligible_clients()
RETURNS TABLE (
  id uuid, anonymous_id text, company_name text, billing_city text,
  interactions bigint, accepted_count bigint, last_interaction_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.anonymous_id, p.company_name, p.billing_city,
         COUNT(ra.id) AS interactions,
         COUNT(ra.id) FILTER (WHERE ra.status = 'accepted') AS accepted_count,
         MAX(ra.created_at) AS last_interaction_at
    FROM public.profiles p
    JOIN public.rides r ON r.client_id = p.id
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
   WHERE ra.escort_id = auth.uid()
   GROUP BY p.id, p.anonymous_id, p.company_name, p.billing_city
   ORDER BY MAX(ra.created_at) DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.escort_eligible_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escort_eligible_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.escort_preferred_client_details()
RETURNS TABLE (
  id uuid, client_id uuid, anonymous_id text, company_name text,
  billing_city text, note text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT epc.id, epc.client_id, p.anonymous_id, p.company_name,
         p.billing_city, epc.note, epc.created_at
    FROM public.escort_preferred_clients epc
    JOIN public.profiles p ON p.id = epc.client_id
   WHERE epc.escort_id = auth.uid()
   ORDER BY epc.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.escort_preferred_client_details() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escort_preferred_client_details() TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_replacement_escorts(_ride_id uuid, _limit int DEFAULT 10)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ride record; v_escort record; v_count int := 0;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = _ride_id;
  IF v_ride.id IS NULL THEN RAISE EXCEPTION 'Ride not found'; END IF;

  FOR v_escort IN
    SELECT ep.id,
           (6371 * 2 * asin(sqrt(
             power(sin(radians((v_ride.pickup_lat - ep.base_lat) / 2)), 2)
             + cos(radians(ep.base_lat)) * cos(radians(v_ride.pickup_lat))
               * power(sin(radians((v_ride.pickup_lng - ep.base_lng) / 2)), 2)
           ))) AS dist_km
      FROM public.escort_profiles ep
     WHERE ep.available = true
       AND v_ride.escort_type_required = ANY(ep.escort_types)
       AND NOT (ep.id = ANY(COALESCE(v_ride.excluded_escort_ids, '{}'::uuid[])))
       AND NOT EXISTS (
         SELECT 1 FROM public.ride_assignments ra
          WHERE ra.ride_id = _ride_id AND ra.escort_id = ep.id
       )
       AND (
         ep.client_filter_mode = 'all'
         OR (ep.client_filter_mode = 'only' AND EXISTS (
              SELECT 1 FROM public.escort_preferred_clients epc
               WHERE epc.escort_id = ep.id AND epc.client_id = v_ride.client_id))
         OR (ep.client_filter_mode = 'except' AND NOT EXISTS (
              SELECT 1 FROM public.escort_preferred_clients epc
               WHERE epc.escort_id = ep.id AND epc.client_id = v_ride.client_id))
       )
     ORDER BY dist_km ASC NULLS LAST
     LIMIT _limit
  LOOP
    INSERT INTO public.ride_assignments (
      ride_id, escort_id, status, travel_to_pickup_min, travel_back_home_min, responds_by
    ) VALUES (_ride_id, v_escort.id, 'invited', 0, 0, now() + interval '30 minutes');

    INSERT INTO public.notifications (user_id, type, title, body, ride_assignment_id)
    VALUES (
      v_escort.id, 'replacement_invite',
      'Nieuwe rit (vervanging) beschikbaar',
      'Er is een vervangende plek vrijgekomen voor de rit ' ||
      v_ride.pickup_city || ' → ' || v_ride.dropoff_city || '.',
      (SELECT id FROM public.ride_assignments
        WHERE ride_id = _ride_id AND escort_id = v_escort.id
        ORDER BY created_at DESC LIMIT 1)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.invite_replacement_escorts(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_replacement_escorts(uuid, int) TO authenticated, service_role;
