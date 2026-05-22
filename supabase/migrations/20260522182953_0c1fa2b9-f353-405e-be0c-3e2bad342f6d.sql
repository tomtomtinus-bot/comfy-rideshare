DROP POLICY IF EXISTS "Authenticated view availability" ON public.escort_availability;

CREATE POLICY "Escort or admin view availability"
ON public.escort_availability
FOR SELECT
TO authenticated
USING (auth.uid() = escort_id OR has_role(auth.uid(), 'admin'::app_role));