
-- Voeg ontvanger-type en company_id toe aan platform_invoices
ALTER TABLE public.platform_invoices
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'opdrachtgever',
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_platform_invoices_recipient_type ON public.platform_invoices(recipient_type);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_company_id ON public.platform_invoices(company_id);

-- Per-ontvanger bijhouden van laatst gefactureerde periode voor begeleiders en bedrijven
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_escort_platform_invoice_at TIMESTAMPTZ;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS last_platform_invoice_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS monthly_subscription_fee NUMERIC DEFAULT 10;

-- RLS-policy zodat planners van een vloot de platformfacturen van hun bedrijf zien
DROP POLICY IF EXISTS "Company planners see own vloot platform invoices" ON public.platform_invoices;
CREATE POLICY "Company planners see own vloot platform invoices"
ON public.platform_invoices
FOR SELECT
USING (
  recipient_type = 'company'
  AND company_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = platform_invoices.company_id
      AND c.owner_id = auth.uid()
  )
);

-- Vervang de generator: nu ook voor begeleiders (zzp) en vloot-bedrijven
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
  is_billing_day BOOLEAN;
  -- Tarieven
  client_per_escort_fee NUMERIC := 2.50;  -- Opdrachtgever: €2,50 per geboekte begeleider per rit
  escort_per_ride_fee   NUMERIC := 1.00;  -- ZZP-begeleider: €1 per succesvol gereden rit
  company_per_ride_fee  NUMERIC := 1.00;  -- Vloot: €1 per succesvol gereden rit
BEGIN
  today_d := EXTRACT(DAY FROM today_dt)::int;
  last_day_of_month := EXTRACT(DAY FROM (date_trunc('month', today_dt) + interval '1 month - 1 day'))::int;
  is_billing_day := (today_d = 15) OR (today_d = last_day_of_month);

  IF NOT _catch_up AND NOT is_billing_day THEN
    RETURN 0;
  END IF;

  IF today_d = 15 THEN
    period_s := date_trunc('month', today_dt)::timestamptz;
  ELSE
    period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
  END IF;
  period_e := (today_dt + interval '1 day')::timestamptz;

  ------------------------------------------------------------------
  -- 1. OPDRACHTGEVERS — €2,50 per geboekte begeleider per rit
  --    + €50/mnd abonnement (30 dgn gratis, 6 mnd 50% korting)
  ------------------------------------------------------------------
  FOR rec IN
    SELECT p.id AS client_id,
           p.last_platform_invoice_at,
           p.created_at AS profile_created_at,
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
      SELECT r.id AS ride_id, COUNT(DISTINCT ra.id) AS num_escorts
      FROM public.rides r
      JOIN public.ride_assignments ra ON ra.ride_id = r.id
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE r.client_id = rec.client_id
        AND r.platform_invoice_id IS NULL
        AND ra.invoice_id IS NOT NULL
        AND inv.created_at >= period_s
        AND inv.created_at < period_e
      GROUP BY r.id
    )
    SELECT COALESCE(ROUND(SUM(num_escorts) * client_per_escort_fee, 2), 0),
           COALESCE(SUM(num_escorts), 0)
    INTO rides_fee, total_esc
    FROM ride_totals;

    IF (rec.profile_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSIF (rec.profile_created_at + interval '6 months') > period_e THEN
      sub_fee := ROUND(rec.monthly_fee * 0.5 * 0.5, 2);
    ELSE
      sub_fee := ROUND(rec.monthly_fee * 0.5, 2);
    END IF;

    IF rides_fee = 0 AND sub_fee = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.client_id, 'opdrachtgever', period_s, period_e, total_esc, rides_fee, sub_fee, rides_fee + sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT new_invoice_id, r.id, r.scheduled_at,
           r.pickup_city || ' → ' || r.dropoff_city,
           COUNT(DISTINCT ra.id),
           ROUND(COUNT(DISTINCT ra.id) * client_per_escort_fee, 2)
    FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e
    GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city;

    IF sub_fee > 0 THEN
      INSERT INTO public.platform_invoice_items
        (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
      VALUES (new_invoice_id, NULL, period_e, 'Abonnement (½ maand)', NULL, sub_fee);
    END IF;

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

  ------------------------------------------------------------------
  -- 2. ZZP-BEGELEIDERS (geen actief company-lidmaatschap)
  --    €2,50/mnd abonnement (30 dgn gratis) + €1 per gereden rit
  ------------------------------------------------------------------
  FOR rec IN
    SELECT p.id AS escort_id,
           p.last_escort_platform_invoice_at AS last_inv,
           p.created_at AS profile_created_at,
           COALESCE(p.monthly_subscription_fee, 2.50) AS monthly_fee
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'begeleider')
      AND NOT EXISTS (
        SELECT 1 FROM public.company_members cm
        WHERE cm.user_id = p.id AND cm.status = 'active'
      )
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_inv, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      IF today_d = 15 THEN
        period_s := date_trunc('month', today_dt)::timestamptz;
      ELSE
        period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
      END IF;
      period_e := (today_dt + interval '1 day')::timestamptz;
    END IF;

    IF period_s >= period_e THEN CONTINUE; END IF;

    SELECT COALESCE(COUNT(DISTINCT ra.id), 0)
    INTO total_esc
    FROM public.ride_assignments ra
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    WHERE ra.escort_id = rec.escort_id
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e;

    rides_fee := ROUND(total_esc * escort_per_ride_fee, 2);

    IF (rec.profile_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSE
      sub_fee := ROUND(rec.monthly_fee * 0.5, 2);
    END IF;

    IF rides_fee = 0 AND sub_fee = 0 THEN
      UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.escort_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.escort_id, 'escort', period_s, period_e, total_esc, rides_fee, sub_fee, rides_fee + sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT new_invoice_id, r.id, r.scheduled_at,
           r.pickup_city || ' → ' || r.dropoff_city, 1, escort_per_ride_fee
    FROM public.ride_assignments ra
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.escort_id = rec.escort_id
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e;

    IF sub_fee > 0 THEN
      INSERT INTO public.platform_invoice_items
        (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
      VALUES (new_invoice_id, NULL, period_e, 'Abonnement (½ maand)', NULL, sub_fee);
    END IF;

    UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.escort_id;
    count_made := count_made + 1;
  END LOOP;

  ------------------------------------------------------------------
  -- 3. VLOOT-BEDRIJVEN (begeleidingsbedrijven)
  --    €10/mnd abonnement (30 dgn gratis) + €1 per gereden rit
  --    van alle chauffeurs binnen het bedrijf
  ------------------------------------------------------------------
  FOR rec IN
    SELECT c.id AS company_id,
           c.owner_id,
           c.created_at AS company_created_at,
           c.last_platform_invoice_at AS last_inv,
           COALESCE(c.monthly_subscription_fee, 10) AS monthly_fee
    FROM public.companies c
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_inv, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      IF today_d = 15 THEN
        period_s := date_trunc('month', today_dt)::timestamptz;
      ELSE
        period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
      END IF;
      period_e := (today_dt + interval '1 day')::timestamptz;
    END IF;

    IF period_s >= period_e THEN CONTINUE; END IF;

    SELECT COALESCE(COUNT(DISTINCT ra.id), 0)
    INTO total_esc
    FROM public.ride_assignments ra
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    JOIN public.company_members cm ON cm.user_id = ra.escort_id AND cm.status = 'active'
    WHERE cm.company_id = rec.company_id
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e;

    rides_fee := ROUND(total_esc * company_per_ride_fee, 2);

    IF (rec.company_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSE
      sub_fee := ROUND(rec.monthly_fee * 0.5, 2);
    END IF;

    IF rides_fee = 0 AND sub_fee = 0 THEN
      UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, company_id, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.owner_id, 'company', rec.company_id, period_s, period_e, total_esc, rides_fee, sub_fee, rides_fee + sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT new_invoice_id, r.id, r.scheduled_at,
           r.pickup_city || ' → ' || r.dropoff_city, 1, company_per_ride_fee
    FROM public.ride_assignments ra
    JOIN public.invoices inv ON inv.id = ra.invoice_id
    JOIN public.rides r ON r.id = ra.ride_id
    JOIN public.company_members cm ON cm.user_id = ra.escort_id AND cm.status = 'active'
    WHERE cm.company_id = rec.company_id
      AND ra.invoice_id IS NOT NULL
      AND inv.created_at >= period_s
      AND inv.created_at < period_e;

    IF sub_fee > 0 THEN
      INSERT INTO public.platform_invoice_items
        (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
      VALUES (new_invoice_id, NULL, period_e, 'Vloot-abonnement (½ maand)', NULL, sub_fee);
    END IF;

    UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
    count_made := count_made + 1;
  END LOOP;

  RETURN count_made;
END;
$function$;
