
CREATE TYPE public.invoice_status AS ENUM ('draft','sent','paid','cancelled');

CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escort_id UUID NOT NULL,
  client_id UUID NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE DEFAULT ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6)),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_hours NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  ride_assignment_id UUID NOT NULL UNIQUE,
  ride_id UUID NOT NULL,
  ride_date TIMESTAMPTZ NOT NULL,
  hours NUMERIC NOT NULL,
  hourly_rate NUMERIC NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT
);

ALTER TABLE public.ride_assignments ADD COLUMN invoiced_at TIMESTAMPTZ;
ALTER TABLE public.ride_assignments ADD COLUMN invoice_id UUID REFERENCES public.invoices(id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escort sees own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() = escort_id);
CREATE POLICY "Client sees own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Escort manages own invoices" ON public.invoices
  FOR ALL TO authenticated USING (auth.uid() = escort_id) WITH CHECK (auth.uid() = escort_id);
CREATE POLICY "Client marks invoice paid" ON public.invoices
  FOR UPDATE TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Parties view invoice items" ON public.invoice_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND (i.escort_id = auth.uid() OR i.client_id = auth.uid()))
  );
CREATE POLICY "Escort manages invoice items" ON public.invoice_items
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.escort_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.escort_id = auth.uid())
  );

CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Function: generate weekly invoices grouping unbilled completed assignments per (escort, client)
CREATE OR REPLACE FUNCTION public.generate_weekly_invoices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ := date_trunc('week', now() - interval '7 days');
  period_e TIMESTAMPTZ := date_trunc('week', now());
BEGIN
  FOR rec IN
    SELECT ra.escort_id, r.client_id,
           SUM(ra.actual_hours) AS hrs,
           SUM(ra.actual_cost) AS amt,
           array_agg(ra.id) AS assignment_ids
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.hours_submitted_at IS NOT NULL
      AND ra.invoiced_at IS NULL
      AND ra.actual_hours IS NOT NULL
    GROUP BY ra.escort_id, r.client_id
  LOOP
    INSERT INTO public.invoices (escort_id, client_id, period_start, period_end, total_hours, total_amount, status)
    VALUES (rec.escort_id, rec.client_id, period_s, period_e, rec.hrs, rec.amt, 'sent')
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT new_invoice_id, ra.id, ra.ride_id, r.scheduled_at, ra.actual_hours,
           CASE WHEN ra.actual_hours > 0 THEN ROUND(ra.actual_cost / ra.actual_hours, 2) ELSE 0 END,
           ra.actual_cost,
           r.pickup_city || ' → ' || r.dropoff_city
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(rec.assignment_ids);

    UPDATE public.ride_assignments
      SET invoiced_at = now(), invoice_id = new_invoice_id
      WHERE id = ANY(rec.assignment_ids);

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$$;

-- Schedule weekly: every Monday at 06:00
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'generate-weekly-invoices',
  '0 6 * * 1',
  $$ SELECT public.generate_weekly_invoices(); $$
);
