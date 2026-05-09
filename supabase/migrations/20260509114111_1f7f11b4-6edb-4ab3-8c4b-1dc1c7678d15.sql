-- Restrict escort access to permits & permit_routes to accepted assignments only
DROP POLICY IF EXISTS "Escort sees permits on assigned rides" ON public.permits;
CREATE POLICY "Escort sees permits on accepted assignments"
ON public.permits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
      FROM public.rides r
      JOIN public.ride_assignments ra ON ra.ride_id = r.id
     WHERE r.permit_id = permits.id
       AND ra.escort_id = auth.uid()
       AND ra.status = 'accepted'
  )
);

DROP POLICY IF EXISTS "Escort sees permit routes on assigned rides" ON public.permit_routes;
CREATE POLICY "Escort sees permit routes on accepted assignments"
ON public.permit_routes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
      FROM public.rides r
      JOIN public.ride_assignments ra ON ra.ride_id = r.id
     WHERE r.permit_id = permit_routes.permit_id
       AND ra.escort_id = auth.uid()
       AND ra.status = 'accepted'
  )
);