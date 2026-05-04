
-- 1. Add billing frequency to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_frequency IN ('weekly','monthly')),
  ADD COLUMN IF NOT EXISTS last_platform_invoice_at TIMESTAMPTZ;

-- 2. Platform invoices table
CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  invoice_number TEXT NOT NULL DEFAULT ('PLAT-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_escorts INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','paid')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client sees own platform invoices"
  ON public.platform_invoices FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

CREATE POLICY "Client marks own platform invoice paid"
  ON public.platform_invoices FOR UPDATE TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE TRIGGER platform_invoices_touch
  BEFORE UPDATE ON public.platform_invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Items
CREATE TABLE IF NOT EXISTS public.platform_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_invoice_id UUID NOT NULL REFERENCES public.platform_invoices(id) ON DELETE CASCADE,
  ride_id UUID NOT NULL,
  ride_date TIMESTAMPTZ NOT NULL,
  route TEXT,
  num_escorts INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client sees own platform invoice items"
  ON public.platform_invoice_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.platform_invoices pi
    WHERE pi.id = platform_invoice_id AND pi.client_id = auth.uid()
  ));

-- 4. Mark rides as invoiced on platform side
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS platform_invoice_id UUID;

CREATE INDEX IF NOT EXISTS idx_rides_platform_invoice ON public.rides(platform_invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_client ON public.platform_invoices(client_id);

-- 5. Generator function
CREATE OR REPLACE FUNCTION public.generate_platform_invoices()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec RECORD;
  ride_rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ;
  period_e TIMESTAMPTZ;
  total_amt NUMERIC;
  total_esc INTEGER;
BEGIN
  FOR rec IN
    SELECT p.id AS client_id, p.billing_frequency, p.last_platform_invoice_at
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    -- Determine period
    IF rec.billing_frequency = 'weekly' THEN
      period_e := date_trunc('week', now());
      period_s := COALESCE(rec.last_platform_invoice_at, period_e - interval '7 days');
      IF now() < period_e THEN CONTINUE; END IF;
    ELSE
      period_e := date_trunc('month', now());
      period_s := COALESCE(rec.last_platform_invoice_at, period_e - interval '1 month');
      IF now() < period_e THEN CONTINUE; END IF;
    END IF;

    IF period_s >= period_e THEN CONTINUE; END IF;

    -- Sum eligible rides
    SELECT COALESCE(SUM(r.num_escorts),0), COALESCE(SUM(r.num_escorts * 2.5),0)
      INTO total_esc, total_amt
    FROM public.rides r
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND r.scheduled_at >= period_s
      AND r.scheduled_at < period_e;

    IF total_esc = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices (client_id, period_start, period_end, total_escorts, total_amount)
    VALUES (rec.client_id, period_s, period_e, total_esc, total_amt)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT new_invoice_id, r.id, r.scheduled_at, r.pickup_city || ' → ' || r.dropoff_city, r.num_escorts, r.num_escorts * 2.5
    FROM public.rides r
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND r.scheduled_at >= period_s
      AND r.scheduled_at < period_e;

    UPDATE public.rides SET platform_invoice_id = new_invoice_id
    WHERE client_id = rec.client_id
      AND platform_invoice_id IS NULL
      AND scheduled_at >= period_s
      AND scheduled_at < period_e;

    UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$$;

-- 6. Daily cron
SELECT cron.schedule(
  'generate-platform-invoices-daily',
  '0 3 * * *',
  $$ SELECT public.generate_platform_invoices(); $$
);
