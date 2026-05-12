-- Favorites table
CREATE TABLE public.client_favorite_escorts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  escort_id uuid NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id, escort_id)
);
CREATE INDEX idx_client_favorite_escorts_client ON public.client_favorite_escorts(client_id);
CREATE INDEX idx_client_favorite_escorts_escort ON public.client_favorite_escorts(escort_id);

ALTER TABLE public.client_favorite_escorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own favorite escorts"
  ON public.client_favorite_escorts FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins view all favorite escorts"
  ON public.client_favorite_escorts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all favorite escorts"
  ON public.client_favorite_escorts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Reason category on excluded
ALTER TABLE public.client_excluded_escorts
  ADD COLUMN IF NOT EXISTS reason_category text;

UPDATE public.client_excluded_escorts SET reason_category = 'Overig' WHERE reason_category IS NULL;
ALTER TABLE public.client_excluded_escorts ALTER COLUMN reason_category SET NOT NULL;
ALTER TABLE public.client_excluded_escorts
  ADD CONSTRAINT client_excluded_escorts_reason_category_check
  CHECK (reason_category IN (
    'Eerdere negatieve ervaring',
    'Voldoet niet aan interne eisen',
    'Veiligheidsincident',
    'Communicatieproblemen',
    'Overig'
  ));

-- Eligible escorts function (security definer to allow joining profiles)
CREATE OR REPLACE FUNCTION public.client_eligible_escorts()
RETURNS TABLE (
  id uuid,
  anonymous_id text,
  full_name text,
  company_name text,
  base_city text,
  vehicle_type text,
  interactions integer,
  accepted_count integer,
  last_interaction_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ep.id,
    ep.anonymous_id,
    p.full_name,
    COALESCE(ep.company_name, p.company_name) AS company_name,
    ep.base_city,
    ep.vehicle_type,
    COUNT(ra.id)::int AS interactions,
    COUNT(ra.id) FILTER (WHERE ra.status = 'accepted'::assignment_status)::int AS accepted_count,
    MAX(ra.invited_at) AS last_interaction_at
  FROM public.ride_assignments ra
  JOIN public.rides r ON r.id = ra.ride_id
  JOIN public.escort_profiles ep ON ep.id = ra.escort_id
  LEFT JOIN public.profiles p ON p.id = ra.escort_id
  WHERE r.client_id = auth.uid()
  GROUP BY ep.id, ep.anonymous_id, p.full_name, ep.company_name, p.company_name, ep.base_city, ep.vehicle_type;
$$;

REVOKE ALL ON FUNCTION public.client_eligible_escorts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_eligible_escorts() TO authenticated;