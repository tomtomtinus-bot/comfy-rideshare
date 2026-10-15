-- B2B SaaS-model: platformfacturen bevatten alleen het vaste maandabonnement.
-- Servicefees, succesfees en de lanceringskorting vervallen.
-- ZZP-begeleider €19/mnd, Transporteur/Planner €49/mnd, Begeleidingsbedrijf €99/mnd.
-- Per halve maand wordt de helft gefactureerd (15e en laatste dag van de maand).

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
  total_esc INTEGER;
  sub_fee NUMERIC;
  today_d INTEGER;
  today_dt DATE := (now() AT TIME ZONE 'Europe/Amsterdam')::date;
  last_day_of_month INTEGER;
  is_billing_day BOOLEAN;
  -- Vaste maandtarieven volgens het B2B SaaS-model (geen rit- of begeleidersfees)
  client_monthly  NUMERIC := 49;   -- Transporteur / Planner (MKB)
  escort_monthly  NUMERIC := 19;   -- Zelfstandige Begeleider (ZZP)
  company_monthly NUMERIC := 99;   -- Begeleidingsbedrijf (Vloot)
BEGIN
  today_d := EXTRACT(DAY FROM today_dt)::int;
  last_day_of_month := EXTRACT(DAY FROM (date_trunc('month', today_dt) + interval '1 month - 1 day'))::int;
  is_billing_day := (today_d = 15) OR (today_d = last_day_of_month);

  IF NOT _catch_up AND NOT is_billing_day THEN
    RETURN 0;
  END IF;

  ------------------------------------------------------------------
  -- 1. OPDRACHTGEVERS — Transporteur / Planner (MKB): €49/mnd
  ------------------------------------------------------------------
  FOR rec IN
    SELECT p.id AS client_id,
           p.last_platform_invoice_at,
           p.created_at AS profile_created_at
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_platform_invoice_at, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSIF today_d = 15 THEN
      period_s := date_trunc('month', today_dt)::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    END IF;

    IF period_s >= period_e THEN CONTINUE; END IF;

    -- Eerste 30 dagen zijn proefperiode: geen abonnementskosten.
    IF (rec.profile_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSE
      sub_fee := ROUND(client_monthly * 0.5, 2);
    END IF;

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
    SELECT COALESCE(SUM(num_escorts), 0) INTO total_esc FROM ride_totals;

    IF sub_fee = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.client_id, 'opdrachtgever', period_s, period_e, COALESCE(total_esc, 0), 0, sub_fee, sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    VALUES (new_invoice_id, NULL, period_e, 'Abonnement (½ maand)', NULL, sub_fee);

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
  -- 2. ZZP-BEGELEIDERS — Zelfstandige Begeleider: €19/mnd
  --    Begeleider zonder eigen vloot (geen tweede actief lid in het bedrijf).
  ------------------------------------------------------------------
  FOR rec IN
    SELECT p.id AS escort_id,
           p.last_escort_platform_invoice_at AS last_inv,
           p.created_at AS profile_created_at
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'begeleider')
      AND NOT EXISTS (
        SELECT 1
        FROM public.company_members cm
        JOIN public.company_members other
          ON other.company_id = cm.company_id
         AND other.status = 'active'
         AND other.user_id <> cm.user_id
        WHERE cm.user_id = p.id AND cm.status = 'active'
      )
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_inv, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSIF today_d = 15 THEN
      period_s := date_trunc('month', today_dt)::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
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

    IF (rec.profile_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSE
      sub_fee := ROUND(escort_monthly * 0.5, 2);
    END IF;

    IF sub_fee = 0 THEN
      UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.escort_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.escort_id, 'escort', period_s, period_e, COALESCE(total_esc, 0), 0, sub_fee, sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    VALUES (new_invoice_id, NULL, period_e, 'Abonnement (½ maand)', NULL, sub_fee);

    UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.escort_id;
    count_made := count_made + 1;
  END LOOP;

  ------------------------------------------------------------------
  -- 3. VLOOT-BEDRIJVEN — Begeleidingsbedrijf: €99/mnd
  --    Bedrijf met meerdere actieve leden; ZZP-en worden hierboven gefactureerd.
  ------------------------------------------------------------------
  FOR rec IN
    SELECT c.id AS company_id,
           c.owner_id,
           c.created_at AS company_created_at,
           c.last_platform_invoice_at AS last_inv
    FROM public.companies c
    WHERE (SELECT COUNT(*) FROM public.company_members cm
           WHERE cm.company_id = c.id AND cm.status = 'active') >= 2
  LOOP
    IF _catch_up THEN
      period_s := COALESCE(rec.last_inv, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSIF today_d = 15 THEN
      period_s := date_trunc('month', today_dt)::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
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

    IF (rec.company_created_at + interval '30 days') > period_e THEN
      sub_fee := 0;
    ELSE
      sub_fee := ROUND(company_monthly * 0.5, 2);
    END IF;

    IF sub_fee = 0 THEN
      UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, company_id, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.owner_id, 'company', rec.company_id, period_s, period_e, COALESCE(total_esc, 0), 0, sub_fee, sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    VALUES (new_invoice_id, NULL, period_e, 'Vloot-abonnement (½ maand)', NULL, sub_fee);

    UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
    count_made := count_made + 1;
  END LOOP;

  RETURN count_made;
END;
$function$;

-- De kolom voor een eigen maandbedrag wordt niet meer uitgelezen: de tarieven
-- zijn vast en staan in de generator hierboven.
COMMENT ON COLUMN public.profiles.monthly_subscription_fee IS 'DEPRECATED: niet langer uitgelezen; vaste tarieven 19/49/99 worden door generate_platform_invoices toegepast';
COMMENT ON COLUMN public.companies.monthly_subscription_fee IS 'DEPRECATED: niet langer uitgelezen; vaste tarieven 19/49/99 worden door generate_platform_invoices toegepast';