
-- 1. Platform_invoices: split rides vs subscription amount
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS rides_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_amount numeric NOT NULL DEFAULT 0;

-- 2. Profiles: per-client subscription fee (default €50/maand)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_subscription_fee numeric NOT NULL DEFAULT 50;

-- 3. Platform_invoice_items.ride_id nullable + route nullable (voor abo-regel zonder rit)
ALTER TABLE public.platform_invoice_items
  ALTER COLUMN ride_id DROP NOT NULL,
  ALTER COLUMN ride_date DROP NOT NULL,
  ALTER COLUMN num_escorts DROP NOT NULL;

-- 4. Herschreven functie: 2x per maand, escort-invoice created_at als peildatum
CREATE OR REPLACE FUNCTION public.generate_platform_invoices(_catch_up boolean DEFAULT false)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ;
  period_e TIMESTAMPTZ;
  rides_fee NUMERIC;
  sub_fee NUMERIC;
  total_esc INTEGER;
  today_d INTEGER;
  today_dt DATE := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  last_day_of_month INTEGER;
  fee_rate NUMERIC := 0.015;
  is_billing_day BOOLEAN;
BEGIN
  today_d := EXTRACT(DAY FROM today_dt)::int;
  last_day_of_month := EXTRACT(DAY FROM (date_trunc('month', today_dt) + interval '1 month - 1 day'))::int;
  is_billing_day := (today_d = 15) OR (today_d = last_day_of_month);

  IF NOT _catch_up AND NOT is_billing_day THEN
    RETURN 0;
  END IF;

  -- Bepaal periode
  IF today_d = 15 THEN
    period_s := date_trunc('day', today_dt::timestamptz AT TIME ZONE 'Europe/Amsterdam') - (today_d - 1) * interval '1 day';
    period_s := date_trunc('month', today_dt)::timestamptz;
    period_e := (today_dt + interval '1 day')::timestamptz;  -- t/m 15e 23:59
  ELSE
    -- laatste dag van de maand: periode 16e t/m vandaag
    period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
    period_e := (today_dt + interval '1 day')::timestamptz;
  END IF;

  FOR rec IN
    SELECT p.id AS client_id, p.last_platform_invoice_at,
           COALESCE(p.monthly_subscription_fee, 50) AS monthly_fee
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_platform_invoice_at, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    END IF;

    IF period_s >= period_e THEN CONTINUE; END IF;

    WITH ride_totals AS (
      SELECT
        r.id AS ride_id,
        r.scheduled_at,
        r.pickup_city,
        r.dropoff_city,
        COUNT(DISTINCT ra.id) AS num_escorts,
        COALESCE(SUM(ii.amount), 0) AS billed_amount
      FROM public.rides r
      JOIN public.ride_assignments ra ON ra.ride_id = r.id
      LEFT JOIN public.invoice_items ii ON ii.ride_id = r.id AND ii.invoice_id = ra.invoice_id
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE r.client_id = rec.client_id
        AND r.platform_invoice_id IS NULL
        AND ra.invoice_id IS NOT NULL
        AND inv.created_at >= period_s
        AND inv.created_at < period_e
      GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city
      HAVING COALESCE(SUM(ii.amount), 0) > 0
    )
    SELECT
      COALESCE(ROUND(SUM(billed_amount) * fee_rate, 2), 0),
      COALESCE(SUM(num_escorts), 0)
    INTO rides_fee, total_esc
    FROM ride_totals;

    sub_fee := ROUND(rec.monthly_fee * 0.5, 2);

    -- Niets te factureren? cursor wel bumpen, géén factuur
    IF rides_fee = 0 AND sub_fee = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.client_id, period_s, period_e, total_esc, rides_fee, sub_fee, rides_fee + sub_fee)
    RETURNING id INTO new_invoice_id;

    -- Rit-regels
    INSERT INTO public.platform_invoice_items (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT
      new_invoice_id,
      r.id,
      r.scheduled_at,
      r.pickup_city || ' → ' || r.dropoff_city,
      COUNT(DISTINCT ra.id),
      ROUND(COALESCE(SUM(ii.amount), 0) * fee_rate, 2)
    FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    LEFT JOIN public.invoice_items ii ON ii.ride_id = r.id AND ii.invoice_id = ra.invoice_id
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e
    GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city
    HAVING COALESCE(SUM(ii.amount), 0) > 0;

    -- Abonnement-regel (50% maandbedrag)
    IF sub_fee > 0 THEN
      INSERT INTO public.platform_invoice_items
        (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
      VALUES
        (new_invoice_id, NULL, period_e, 'Abonnement (½ maand)', NULL, sub_fee);
    END IF;

    -- Markeer ritten als gefactureerd
    UPDATE public.rides SET platform_invoice_id = new_invoice_id
    WHERE client_id = rec.client_id
      AND platform_invoice_id IS NULL
      AND id IN (
        SELECT r.id FROM public.rides r
        JOIN public.ride_assignments ra ON ra.ride_id = r.id
        JOIN public.invoices inv ON inv.id = ra.invoice_id
        WHERE r.client_id = rec.client_id
          AND inv.created_at >= period_s
          AND inv.created_at < period_e
      );

    UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
    count_made := count_made + 1;
  END LOOP;

  RETURN count_made;
END;
$function$;
