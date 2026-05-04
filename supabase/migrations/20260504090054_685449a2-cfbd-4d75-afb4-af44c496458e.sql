
CREATE TABLE public.weekly_fuel_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL UNIQUE,
  eur_per_liter NUMERIC(6,4) NOT NULL,
  source TEXT NOT NULL DEFAULT 'CBS',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_fuel_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read fuel prices"
  ON public.weekly_fuel_prices FOR SELECT
  TO authenticated USING (true);

CREATE INDEX idx_weekly_fuel_prices_week ON public.weekly_fuel_prices(week_start DESC);
