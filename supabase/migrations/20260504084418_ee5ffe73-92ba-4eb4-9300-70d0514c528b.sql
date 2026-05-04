
-- Helper functions to avoid recursive RLS between rides and ride_assignments
CREATE OR REPLACE FUNCTION public.is_ride_client(_ride_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.rides WHERE id = _ride_id AND client_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_escort(_ride_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.ride_assignments WHERE ride_id = _ride_id AND escort_id = _user_id)
$$;

-- Rebuild rides policies
DROP POLICY IF EXISTS "Escort sees rides assigned" ON public.rides;
CREATE POLICY "Escort sees rides assigned" ON public.rides
  FOR SELECT TO authenticated
  USING (public.is_assigned_escort(id, auth.uid()));

-- Rebuild ride_assignments policies that referenced rides
DROP POLICY IF EXISTS "Client sees assignments on own rides" ON public.ride_assignments;
DROP POLICY IF EXISTS "Client creates assignments on own rides" ON public.ride_assignments;
DROP POLICY IF EXISTS "Client updates assignments on own rides" ON public.ride_assignments;

CREATE POLICY "Client sees assignments on own rides" ON public.ride_assignments
  FOR SELECT TO authenticated
  USING (public.is_ride_client(ride_id, auth.uid()));

CREATE POLICY "Client creates assignments on own rides" ON public.ride_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_ride_client(ride_id, auth.uid()));

CREATE POLICY "Client updates assignments on own rides" ON public.ride_assignments
  FOR UPDATE TO authenticated
  USING (public.is_ride_client(ride_id, auth.uid()))
  WITH CHECK (public.is_ride_client(ride_id, auth.uid()));
