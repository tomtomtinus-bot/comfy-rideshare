
CREATE POLICY "Client or fleet planner can read escort_profile after accept"
ON public.escort_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.escort_id = escort_profiles.id
      AND ra.status = 'accepted'::assignment_status
      AND (
        r.client_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.company_members cm_planner
          JOIN public.company_members cm_client
            ON cm_client.company_id = cm_planner.company_id
          WHERE cm_planner.user_id = auth.uid()
            AND cm_planner.role = 'planner'
            AND cm_planner.status = 'active'
            AND cm_client.user_id = r.client_id
            AND cm_client.status = 'active'
        )
      )
  )
);
