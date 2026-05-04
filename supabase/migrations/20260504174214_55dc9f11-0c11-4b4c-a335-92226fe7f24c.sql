CREATE OR REPLACE FUNCTION public.generate_weekly_invoices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  ec_rec RECORD;
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

    -- Uren-regel per assignment (excl. extra kosten)
    INSERT INTO public.invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
    SELECT new_invoice_id, ra.id, ra.ride_id, r.scheduled_at, ra.actual_hours,
           CASE WHEN ra.actual_hours > 0
                THEN ROUND((ra.actual_cost - COALESCE(ra.extra_costs_total, 0)) / ra.actual_hours, 2)
                ELSE 0 END,
           ROUND(ra.actual_cost - COALESCE(ra.extra_costs_total, 0), 2),
           r.pickup_city || ' → ' || r.dropoff_city
    FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.id = ANY(rec.assignment_ids);

    -- Extra kosten als losse regels
    FOR ec_rec IN
      SELECT ra.id AS assignment_id, ra.ride_id, r.scheduled_at,
             elem->>'description' AS description,
             COALESCE((elem->>'amount')::numeric, 0) AS amount
      FROM public.ride_assignments ra
      JOIN public.rides r ON r.id = ra.ride_id
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ra.extra_costs, '[]'::jsonb)) AS elem
      WHERE ra.id = ANY(rec.assignment_ids)
    LOOP
      INSERT INTO public.invoice_items (invoice_id, ride_assignment_id, ride_id, ride_date, hours, hourly_rate, amount, description)
      VALUES (new_invoice_id, ec_rec.assignment_id, ec_rec.ride_id, ec_rec.scheduled_at, 0, 0, ec_rec.amount,
              'Extra kosten: ' || COALESCE(ec_rec.description, ''));
    END LOOP;

    UPDATE public.ride_assignments
      SET invoiced_at = now(), invoice_id = new_invoice_id
      WHERE id = ANY(rec.assignment_ids);

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$function$;