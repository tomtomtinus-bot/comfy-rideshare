
CREATE POLICY "Fleet planner can read own fleet escort profiles"
ON public.escort_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.company_members cm_driver
    JOIN public.company_members cm_planner
      ON cm_planner.company_id = cm_driver.company_id
    WHERE cm_driver.user_id = escort_profiles.id
      AND cm_driver.status = 'active'
      AND cm_planner.user_id = auth.uid()
      AND cm_planner.role = 'planner'
      AND cm_planner.status = 'active'
  )
);
