-- Allow admins to manage weekly fuel prices
CREATE POLICY "Admins manage fuel prices"
ON public.weekly_fuel_prices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));