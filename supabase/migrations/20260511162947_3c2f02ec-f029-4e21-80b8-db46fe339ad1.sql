
-- 1) Reschedule fuel fetches: Monday 03:00 (NL), 03:10 (BE), 03:20 (FR)
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN (
  'fetch-fuel-prices-nl-weekly','fetch-fuel-prices-be-weekly','fetch-fuel-prices-fr-weekly',
  'generate-weekly-invoices','generate-platform-invoices-daily','generate-platform-invoices-weekly'
);

SELECT cron.schedule(
  'fetch-fuel-prices-nl-weekly','0 3 * * 1',
  $$ SELECT net.http_post(
    url := 'https://qsiduhrmgunvipxelgpe.supabase.co/functions/v1/fetch-fuel-prices',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
SELECT cron.schedule(
  'fetch-fuel-prices-be-weekly','10 3 * * 1',
  $$ SELECT net.http_post(
    url := 'https://qsiduhrmgunvipxelgpe.supabase.co/functions/v1/fetch-fuel-prices-be',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);
SELECT cron.schedule(
  'fetch-fuel-prices-fr-weekly','20 3 * * 1',
  $$ SELECT net.http_post(
    url := 'https://qsiduhrmgunvipxelgpe.supabase.co/functions/v1/fetch-fuel-prices-fr',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  ); $$
);

-- 2) Helper: map escort billing_country to fuel-price country code
CREATE OR REPLACE FUNCTION public.fuel_country_code(p_country text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(coalesce(p_country,''))
    WHEN 'belgië' THEN 'BE' WHEN 'belgie' THEN 'BE' WHEN 'belgium' THEN 'BE' WHEN 'be' THEN 'BE'
    WHEN 'frankrijk' THEN 'FR' WHEN 'france' THEN 'FR' WHEN 'fr' THEN 'FR'
    WHEN 'duitsland' THEN 'DE' WHEN 'deutschland' THEN 'DE' WHEN 'germany' THEN 'DE' WHEN 'de' THEN 'DE'
    WHEN 'luxemburg' THEN 'LU' WHEN 'luxembourg' THEN 'LU' WHEN 'lu' THEN 'LU'
    ELSE 'NL' END;
$$;

-- 3) Helper: compute fuel surcharge for one assignment
CREATE OR REPLACE FUNCTION public.compute_fuel_surcharge(
  p_escort_id uuid, p_ride_date timestamptz, p_hours numeric, p_base_amount numeric
) RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cfg jsonb; kind text; enabled boolean;
  cc text; price numeric; tier jsonb; v numeric;
BEGIN
  SELECT fuel_surcharge, fuel_country_code(billing_country)
    INTO cfg, cc
    FROM escort_profiles WHERE id = p_escort_id;
  IF cfg IS NULL THEN RETURN 0; END IF;
  enabled := COALESCE((cfg->>'enabled')::boolean, false);
  IF NOT enabled THEN RETURN 0; END IF;
  kind := COALESCE(cfg->>'kind', 'per_uur');

  SELECT eur_per_liter INTO price
    FROM weekly_fuel_prices
   WHERE country = cc AND week_start <= (p_ride_date::date)
   ORDER BY week_start DESC LIMIT 1;
  IF price IS NULL THEN RETURN 0; END IF;

  FOR tier IN SELECT * FROM jsonb_array_elements(COALESCE(cfg->'tiers','[]'::jsonb)) LOOP
    IF price >= COALESCE((tier->>'from')::numeric, 0)
       AND (tier->>'to' IS NULL OR tier->>'to' = '' OR price < (tier->>'to')::numeric) THEN
      v := COALESCE((tier->>'value')::numeric, 0);
      IF kind = 'percent' THEN
        RETURN ROUND(p_base_amount * v / 100.0, 2);
      ELSE
        RETURN ROUND(p_hours * v, 2);
      END IF;
    END IF;
  END LOOP;
  RETURN 0;
END;
$$;

-- 4) Update generate_weekly_invoices: add fuel surcharge as separate line, add to total
CREATE OR REPLACE FUNCTION public.generate_weekly_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD; ec_rec RECORD; fs_rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ := date_trunc('week', now() - interval '7 days');
  period_e TIMESTAMPTZ := date_trunc('week', now());
  fuel_total NUMERIC := 0;
  base_total NUMERIC := 0;
BEGIN
  FOR rec IN
    SELECT ra.escort_id, r.client_id,
           SUM(ra.actual_hours) AS hrs,
           array_agg(ra.id) AS assignment_ids
    FROM ride_assignments ra
    JOIN rides r ON r.id = ra.ride_id
    WHERE ra.hours_submitted_at IS NOT NULL
      AND ra.invoiced_at IS NULL
      AND ra.actual_hours IS NOT NULL
    GROUP BY ra.escort_id, r.client_id
  LOOP
    INSERT INTO invoices (escort_id, client_id, period_start, period_end, total_hours, total_amount, status)
    VALUES (rec.escort_id, rec.client_id, period_s, period_e, rec.hrs, 0, 'sent')
    RETURNING id INTO new_invoice_id;

    -- Uren-regel per assignment (excl. extra kosten)
    INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT new_invoice_id, ra.id, ra.ride_id, r.scheduled_at, ra.actual_hours,
           CASE WHEN ra.actual_hours > 0
                THEN ROUND((ra.actual_cost - COALESCE(ra.extra_costs_total, 0)) / ra.actual_hours, 2)
                ELSE 0 END,
           ROUND(ra.actual_cost - COALESCE(ra.extra_costs_total, 0), 2),
           r.pickup_city || ' → ' || r.dropoff_city
    FROM ride_assignments ra
    JOIN rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(rec.assignment_ids);

    -- Extra kosten per regel
    FOR ec_rec IN
      SELECT ra.id AS assignment_id, ra.ride_id, r.scheduled_at,
             elem->>'description' AS description,
             COALESCE((elem->>'amount')::numeric, 0) AS amount
      FROM ride_assignments ra
      JOIN rides r ON r.id = ra.ride_id
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ra.extra_costs, '[]'::jsonb)) AS elem
      WHERE ra.id = ANY(rec.assignment_ids)
    LOOP
      INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
      VALUES (new_invoice_id, ec_rec.assignment_id, ec_rec.ride_id, ec_rec.scheduled_at, 0, 0, ec_rec.amount,
              'Extra kosten: ' || COALESCE(ec_rec.description, ''));
    END LOOP;

    -- Brandstoftoeslag per assignment
    fuel_total := 0;
    FOR fs_rec IN
      SELECT ra.id AS assignment_id, ra.ride_id, r.scheduled_at, ra.actual_hours,
             (ra.actual_cost - COALESCE(ra.extra_costs_total,0)) AS base_amt,
             compute_fuel_surcharge(ra.escort_id, r.scheduled_at, ra.actual_hours,
               (ra.actual_cost - COALESCE(ra.extra_costs_total,0))) AS surcharge
      FROM ride_assignments ra
      JOIN rides r ON r.id = ra.ride_id
      WHERE ra.id = ANY(rec.assignment_ids)
    LOOP
      IF fs_rec.surcharge > 0 THEN
        INSERT INTO invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
        VALUES (new_invoice_id, fs_rec.assignment_id, fs_rec.ride_id, fs_rec.scheduled_at, 0, 0, fs_rec.surcharge,
                'Brandstoftoeslag');
        fuel_total := fuel_total + fs_rec.surcharge;
      END IF;
    END LOOP;

    -- Bereken totaal o.b.v. items
    SELECT COALESCE(SUM(amount),0) INTO base_total FROM invoice_items WHERE invoice_id = new_invoice_id;
    UPDATE invoices SET total_amount = base_total WHERE id = new_invoice_id;

    UPDATE ride_assignments
      SET invoiced_at = now(), invoice_id = new_invoice_id
      WHERE id = ANY(rec.assignment_ids);

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_weekly_invoices() FROM PUBLIC, anon, authenticated;

-- 5) Update generate_platform_invoices: 1.5% fee, weekly
CREATE OR REPLACE FUNCTION public.generate_platform_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ;
  period_e TIMESTAMPTZ;
  total_amt NUMERIC;
  total_esc INTEGER;
  fee_rate NUMERIC := 0.015;
BEGIN
  period_e := date_trunc('week', now());

  FOR rec IN
    SELECT p.id AS client_id, p.last_platform_invoice_at
    FROM profiles p
    WHERE EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    period_s := COALESCE(rec.last_platform_invoice_at, period_e - interval '7 days');
    IF period_s >= period_e THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(ra.actual_cost), 0), COALESCE(COUNT(DISTINCT ra.escort_id), 0)
      INTO total_amt, total_esc
      FROM rides r
      JOIN ride_assignments ra ON ra.ride_id = r.id
     WHERE r.client_id = rec.client_id
       AND r.platform_invoice_id IS NULL
       AND ra.hours_submitted_at IS NOT NULL
       AND ra.actual_cost IS NOT NULL
       AND r.scheduled_at >= period_s
       AND r.scheduled_at < period_e;

    IF total_amt = 0 THEN
      UPDATE profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    total_amt := ROUND(total_amt * fee_rate, 2);

    INSERT INTO platform_invoices (client_id, period_start, period_end, total_escorts, total_amount)
    VALUES (rec.client_id, period_s, period_e, total_esc, total_amt)
    RETURNING id INTO new_invoice_id;

    INSERT INTO platform_invoice_items (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT new_invoice_id, r.id, r.scheduled_at,
           r.pickup_city || ' → ' || r.dropoff_city,
           COALESCE(COUNT(ra.id), 0),
           ROUND(COALESCE(SUM(ra.actual_cost), 0) * fee_rate, 2)
      FROM rides r
      JOIN ride_assignments ra ON ra.ride_id = r.id
     WHERE r.client_id = rec.client_id
       AND r.platform_invoice_id IS NULL
       AND ra.hours_submitted_at IS NOT NULL
       AND ra.actual_cost IS NOT NULL
       AND r.scheduled_at >= period_s
       AND r.scheduled_at < period_e
     GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city;

    UPDATE rides SET platform_invoice_id = new_invoice_id
     WHERE client_id = rec.client_id
       AND platform_invoice_id IS NULL
       AND scheduled_at >= period_s
       AND scheduled_at < period_e
       AND EXISTS (SELECT 1 FROM ride_assignments ra
                    WHERE ra.ride_id = rides.id
                      AND ra.hours_submitted_at IS NOT NULL
                      AND ra.actual_cost IS NOT NULL);

    UPDATE profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_platform_invoices() FROM PUBLIC, anon, authenticated;

-- 6) Reschedule invoice cron jobs (after fuel fetch)
SELECT cron.schedule(
  'generate-weekly-invoices','0 6 * * 1',
  $$ SELECT public.generate_weekly_invoices(); $$
);
SELECT cron.schedule(
  'generate-platform-invoices-weekly','0 7 * * 1',
  $$ SELECT public.generate_platform_invoices(); $$
);
