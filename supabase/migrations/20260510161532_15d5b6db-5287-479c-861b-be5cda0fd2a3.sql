
ALTER TABLE public.weekly_fuel_prices
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NL';

UPDATE public.weekly_fuel_prices SET country = 'NL' WHERE country IS NULL;

ALTER TABLE public.weekly_fuel_prices
  DROP CONSTRAINT IF EXISTS weekly_fuel_prices_week_start_key;

ALTER TABLE public.weekly_fuel_prices
  ADD CONSTRAINT weekly_fuel_prices_country_week_start_key UNIQUE (country, week_start);

ALTER TABLE public.weekly_fuel_prices
  ADD CONSTRAINT weekly_fuel_prices_country_check CHECK (country IN ('NL','BE','FR','DE','LU'));

DROP POLICY IF EXISTS "Authenticated read fuel prices" ON public.weekly_fuel_prices;

CREATE POLICY "Read NL fuel prices (all)"
  ON public.weekly_fuel_prices FOR SELECT
  TO authenticated
  USING (country = 'NL');

CREATE POLICY "Read country-specific fuel prices for residents"
  ON public.weekly_fuel_prices FOR SELECT
  TO authenticated
  USING (
    country <> 'NL'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          (country = 'BE' AND lower(coalesce(p.billing_country,'')) IN ('belgië','belgie','belgium','be'))
          OR (country = 'FR' AND lower(coalesce(p.billing_country,'')) IN ('frankrijk','france','fr'))
          OR (country = 'DE' AND lower(coalesce(p.billing_country,'')) IN ('duitsland','deutschland','germany','de'))
          OR (country = 'LU' AND lower(coalesce(p.billing_country,'')) IN ('luxemburg','luxembourg','lu'))
        )
    )
  );
