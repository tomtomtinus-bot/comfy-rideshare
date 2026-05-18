CREATE OR REPLACE FUNCTION public.generate_weekly_invoices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec RECORD; ec_rec RECORD; fs_rec RECORD;
  new_invoice_id UUID;
  count_made INTEGER := 0;
  period_s TIMESTAMPTZ := date_trunc('week', now() - interval '7 days');
  period_e TIMESTAMPTZ := date_trunc('week', now());
  base_total NUMERIC := 0;
  prev_week_start DATE := (date_trunc('week', now() - interval '7 days'))::date;
BEGIN
  -- Guard: vereis dat het weekgemiddelde van de afgelopen week beschikbaar is
  -- (NL als referentiebron) voordat er facturen worden gegenereerd.
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

    count_made := count_made + 1;
  END LOOP;
  RETURN count_made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_weekly_invoices() FROM PUBLIC, anon, authenticated;