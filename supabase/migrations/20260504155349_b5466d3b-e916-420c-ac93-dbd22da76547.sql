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
  fee_rate NUMERIC := 0.01;
BEGIN
  period_e := date_trunc('week', now());

  FOR rec IN
    SELECT p.id AS client_id, p.last_platform_invoice_at
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'opdrachtgever')
  LOOP
    period_s := COALESCE(rec.last_platform_invoice_at, period_e - interval '7 days');
    IF period_s >= period_e THEN CONTINUE; END IF;

    SELECT
      COALESCE(SUM(ra.actual_cost), 0),
      COALESCE(COUNT(DISTINCT ra.escort_id), 0)
    INTO total_amt, total_esc
    FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND ra.hours_submitted_at IS NOT NULL
      AND ra.actual_cost IS NOT NULL
      AND r.scheduled_at >= period_s
      AND r.scheduled_at < period_e;

    IF total_amt = 0 THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;
      CONTINUE;
    END IF;

    total_amt := ROUND(total_amt * fee_rate, 2);

    INSERT INTO public.platform_invoices (client_id, period_start, period_end, total_escorts, total_amount)
    VALUES (rec.client_id, period_s, period_e, total_esc, total_amt)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    SELECT
      new_invoice_id,
      r.id,
      r.scheduled_at,
      r.pickup_city || ' → ' || r.dropoff_city,
      COALESCE(COUNT(ra.id), 0),
      ROUND(COALESCE(SUM(ra.actual_cost), 0) * fee_rate, 2)
    FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    WHERE r.client_id = rec.client_id
      AND r.platform_invoice_id IS NULL
      AND ra.hours_submitted_at IS NOT NULL
      AND ra.actual_cost IS NOT NULL
      AND r.scheduled_at >= period_s
      AND r.scheduled_at < period_e
    GROUP BY r.id, r.scheduled_at, r.pickup_city, r.dropoff_city;

    UPDATE public.rides SET platform_invoice_id = new_invoice_id
    WHERE client_id = rec.client_id
      AND platform_invoice_id IS NULL
      AND scheduled_at >= period_s
      AND scheduled_at < period_e
      AND EXISTS (
        SELECT 1 FROM public.ride_assignments ra
        WHERE ra.ride_id = rides.id
          AND ra.hours_submitted_at IS NOT NULL
          AND ra.actual_cost IS NOT NULL
      );

    UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.client_id;

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$function$;