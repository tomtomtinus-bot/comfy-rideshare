
CREATE OR REPLACE FUNCTION public.generate_weekly_invoices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD; ec_rec RECORD; fs_rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ := date_trunc('week', now() - interval '7 days');
  period_e TIMESTAMPTZ := date_trunc('week', now());
  base_total NUMERIC := 0;
  prev_week_start DATE := (date_trunc('week', now() - interval '7 days'))::date;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.weekly_fuel_prices
    WHERE country = 'NL' AND week_start = prev_week_start
  ) THEN
    RAISE NOTICE 'generate_weekly_invoices: geen NL brandstofprijs voor week %, generatie overgeslagen', prev_week_start;
    RETURN 0;
  END IF;

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

    FOR fs_rec IN
      SELECT ra.id AS assignment_id, ra.ride_id, r.scheduled_at, ra.actual_hours,
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
      END IF;
    END LOOP;

    SELECT COALESCE(SUM(amount),0) INTO base_total FROM invoice_items WHERE invoice_id = new_invoice_id;
    UPDATE invoices SET total_amount = base_total WHERE id = new_invoice_id;

    UPDATE ride_assignments
      SET invoiced_at = now(), invoice_id = new_invoice_id
      WHERE id = ANY(rec.assignment_ids);

    -- Meldingen: begeleider én opdrachtgever krijgen een notificatie (bel + popup)
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      rec.escort_id,
      'invoice_ready',
      'Uw factuur is klaar',
      'De factuur voor de ritten van afgelopen week (€ ' || to_char(base_total, 'FM999990.00') ||
      ') is automatisch aangemaakt en staat klaar in uw dashboard.'
    );

    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      rec.client_id,
      'invoice_ready',
      'Nieuwe factuur ontvangen',
      'Er is een factuur klaargezet voor de ritten van afgelopen week (€ ' || to_char(base_total, 'FM999990.00') ||
      '). U kunt deze bekijken in uw dashboard.'
    );

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_platform_invoices()
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
  total_amt NUMERIC;
  total_esc INTEGER;
  fee_rate NUMERIC := 0.015;
BEGIN
  period_e := date_trunc('week', now());

  FOR rec IN
    SELECT p.id AS client_id, p.last_platform_invoice_at
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    period_s := COALESCE(rec.last_platform_invoice_at, period_e - interval '7 days');
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
      WHERE r.client_id = rec.client_id
        AND r.platform_invoice_id IS NULL
        AND ra.invoice_id IS NOT NULL
        AND r.scheduled_at >= period_s
        AND r.scheduled_at < period_e
      GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city
      HAVING COALESCE(SUM(ii.amount), 0) > 0
    )
    SELECT
      COALESCE(ROUND(SUM(billed_amount) * fee_rate, 2), 0),
      COALESCE(SUM(num_escorts), 0)
    INTO total_amt, total_esc
    FROM ride_totals;

    IF total_amt = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    INSERT INTO public.platform_invoices (client_id, period_start, period_end, total_escorts, total_amount)
    VALUES (rec.client_id, period_s, period_e, total_esc, total_amt)
    RETURNING id INTO new_invoice_id;

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
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND ra.invoice_id IS NOT NULL
      AND r.scheduled_at >= period_s
      AND r.scheduled_at < period_e
    GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city
    HAVING COALESCE(SUM(ii.amount), 0) > 0;

    UPDATE public.rides SET platform_invoice_id = new_invoice_id
    WHERE client_id = rec.client_id
      AND platform_invoice_id IS NULL
      AND scheduled_at >= period_s
      AND scheduled_at < period_e
      AND EXISTS (
        SELECT 1 FROM public.ride_assignments ra
        WHERE ra.ride_id = rides.id
          AND ra.invoice_id IS NOT NULL
      );

    UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;

    -- Melding: opdrachtgever krijgt een notificatie zodra de platformfactuur klaarstaat
    INSERT INTO public.notifications (user_id, type, title, body)
    VALUES (
      rec.client_id,
      'platform_invoice_ready',
      'Platformfactuur (app fee) klaar',
      'Uw platformfactuur voor afgelopen week (€ ' || to_char(total_amt, 'FM999990.00') ||
      ') is aangemaakt en staat klaar in uw dashboard.'
    );

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$function$;
