-- Pakketkeuze per account: ZZP-begeleider, Planner of Vloot-bedrijf.
-- Het pakket bepaalt uitsluitend welk vast tarief op de platformfactuur komt.
-- Rechten blijven uitsluitend in public.user_roles staan (opdrachtgever/begeleider/admin).

CREATE TABLE public.account_packages (
  user_id uuid NOT NULL PRIMARY KEY,
  package text NOT NULL CHECK (package IN ('zzp','planner','vloot')),
  source text NOT NULL DEFAULT 'signup',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.account_packages IS 'Facturatiepakket (zzp/planner/vloot) per account. Bepaalt alleen het tarief op de platformfactuur; rechten blijven in public.user_roles.';

GRANT SELECT ON public.account_packages TO authenticated;
GRANT ALL ON public.account_packages TO service_role;

ALTER TABLE public.account_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User views own package" ON public.account_packages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Het eigen pakket vastleggen. De gebruiker kan alleen het eigen pakket kiezen:
-- de functie vult auth.uid() zelf in en accepteert alleen de drie bekende waarden.
CREATE OR REPLACE FUNCTION public.set_account_package(_package text, _source text DEFAULT 'signup')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _package NOT IN ('zzp','planner','vloot') THEN
    RAISE EXCEPTION 'Invalid package';
  END IF;

  INSERT INTO public.account_packages (user_id, package, source)
  VALUES (v_uid, _package, COALESCE(NULLIF(_source, ''), 'signup'))
  ON CONFLICT (user_id) DO UPDATE
    SET package = EXCLUDED.package,
        source = EXCLUDED.source,
        updated_at = now();

  -- Een vlootaccount krijgt direct een eigen bedrijf, zodat er planners-accounts
  -- en chauffeurs bij kunnen worden uitgenodigd.
  IF _package = 'vloot' THEN
    SELECT c.id INTO v_company
      FROM public.companies c
      JOIN public.company_members cm ON cm.company_id = c.id
     WHERE cm.user_id = v_uid AND cm.status = 'active'
     LIMIT 1;

    IF v_company IS NULL THEN
      INSERT INTO public.companies (owner_id, name, seat_limit)
      VALUES (
        v_uid,
        COALESCE((SELECT COALESCE(company_name, full_name, 'Bedrijf') FROM public.profiles WHERE id = v_uid), 'Bedrijf'),
        999
      )
      ON CONFLICT (owner_id) DO UPDATE SET seat_limit = GREATEST(companies.seat_limit, 999)
      RETURNING id INTO v_company;

      INSERT INTO public.company_members (company_id, user_id, role, status)
      VALUES (v_company, v_uid, 'planner', 'active')
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
END;
$function$;

-- Welk pakket hoort bij een account: eerst de eigen keuze, anders de rol en
-- het aantal actieve leden van het bedrijf.
CREATE OR REPLACE FUNCTION public.account_package_of(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT ap.package FROM public.account_packages ap WHERE ap.user_id = _user_id),
    CASE
      WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'opdrachtgever') THEN 'planner'
      WHEN EXISTS (
        SELECT 1
        FROM public.company_members cm
        JOIN public.company_members other
          ON other.company_id = cm.company_id
         AND other.status = 'active'
         AND other.user_id <> cm.user_id
        WHERE cm.user_id = _user_id AND cm.status = 'active'
      ) THEN 'vloot'
      ELSE 'zzp'
    END
  );
$function$;

-- Platformfacturen: één factuur per account, tarief naar gekozen pakket.
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
  v_pkg TEXT;
  v_trial_anchor TIMESTAMPTZ;
  v_last TEXT;
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

  FOR rec IN
    SELECT p.id AS user_id,
           p.created_at AS profile_created_at,
           p.last_platform_invoice_at,
           p.last_escort_platform_invoice_at,
           c.id AS company_id,
           c.created_at AS company_created_at,
           c.last_platform_invoice_at AS company_last_inv
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT c.id, c.created_at, c.last_platform_invoice_at
      FROM public.companies c
      JOIN public.company_members cm ON cm.company_id = c.id
      WHERE cm.user_id = p.id AND cm.status = 'active'
      ORDER BY (c.owner_id = p.id) DESC NULLS LAST, c.created_at
      LIMIT 1
    ) c ON TRUE
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role IN ('opdrachtgever','begeleider')
    )
  LOOP
    v_pkg := public.account_package_of(rec.user_id);

    -- Zonder eigen bedrijf kan een vlootfactuur niet uitkomen: terugvallen op ZZP.
    IF v_pkg = 'vloot' AND rec.company_id IS NULL THEN
      v_pkg := 'zzp';
    END IF;

    sub_fee := ROUND(
      CASE v_pkg
        WHEN 'planner' THEN client_monthly
        WHEN 'vloot'   THEN company_monthly
        ELSE escort_monthly
      END * 0.5, 2);

    -- Periode van deze factuur: halve maand, of vanaf de vorige factuur bij inhalen.
    v_last := GREATEST(
      COALESCE(rec.last_platform_invoice_at, rec.last_escort_platform_invoice_at, rec.company_last_inv),
      COALESCE(rec.last_escort_platform_invoice_at, rec.last_platform_invoice_at, rec.company_last_inv),
      COALESCE(rec.company_last_inv, rec.last_platform_invoice_at, rec.last_escort_platform_invoice_at)
    );

    IF _catch_up THEN
      period_s := COALESCE(v_last, today_dt::timestamptz - interval '60 days');
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSIF today_d = 15 THEN
      period_s := date_trunc('month', today_dt)::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    ELSE
      period_s := (date_trunc('month', today_dt) + interval '15 days')::timestamptz;
      period_e := (today_dt + interval '1 day')::timestamptz;
    END IF;

    IF period_s >= period_e THEN
      CONTINUE;
    END IF;

    -- Eerste 30 dagen zijn proefperiode: geen abonnementskosten.
    v_trial_anchor := CASE
      WHEN v_pkg = 'vloot' THEN COALESCE(rec.company_created_at, rec.profile_created_at)
      ELSE rec.profile_created_at
    END;

    IF (v_trial_anchor + interval '30 days') > period_e THEN
      UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.user_id;
      IF v_pkg = 'zzp' THEN
        UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.user_id;
      ELSIF v_pkg = 'vloot' THEN
        UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
      END IF;
      CONTINUE;
    END IF;

    -- Aantal begeleiders in de periode, puur als toelichting op de factuur.
    IF v_pkg = 'planner' THEN
      SELECT COALESCE(COUNT(DISTINCT ra.id), 0) INTO total_esc
      FROM public.rides r
      JOIN public.ride_assignments ra ON ra.ride_id = r.id
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE r.client_id = rec.user_id
        AND ra.invoice_id IS NOT NULL
        AND inv.created_at >= period_s
        AND inv.created_at < period_e;
    ELSIF v_pkg = 'vloot' THEN
      SELECT COALESCE(COUNT(DISTINCT ra.id), 0) INTO total_esc
      FROM public.ride_assignments ra
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      JOIN public.company_members cm ON cm.user_id = ra.escort_id AND cm.status = 'active'
      WHERE cm.company_id = rec.company_id
        AND ra.invoice_id IS NOT NULL
        AND inv.created_at >= period_s
        AND inv.created_at < period_e;
    ELSE
      SELECT COALESCE(COUNT(DISTINCT ra.id), 0) INTO total_esc
      FROM public.ride_assignments ra
      JOIN public.invoices inv ON inv.id = ra.invoice_id
      WHERE ra.escort_id = rec.user_id
        AND ra.invoice_id IS NOT NULL
        AND inv.created_at >= period_s
        AND inv.created_at < period_e;
    END IF;

    INSERT INTO public.platform_invoices
      (client_id, recipient_type, company_id, period_start, period_end, total_escorts, rides_amount, subscription_amount, total_amount)
    VALUES
      (rec.user_id,
       CASE v_pkg WHEN 'planner' THEN 'opdrachtgever' WHEN 'vloot' THEN 'company' ELSE 'escort' END,
       CASE WHEN v_pkg = 'vloot' THEN rec.company_id ELSE NULL END,
       period_s, period_e, COALESCE(total_esc, 0), 0, sub_fee, sub_fee)
    RETURNING id INTO new_invoice_id;

    INSERT INTO public.platform_invoice_items
      (platform_invoice_id, ride_id, ride_date, route, num_escorts, amount)
    VALUES (new_invoice_id, NULL, period_e,
            CASE WHEN v_pkg = 'vloot' THEN 'Vloot-abonnement (½ maand)' ELSE 'Abonnement (½ maand)' END,
            NULL, sub_fee);

    -- Ritten van de planner meekoppelen zodat ze op dezelfde factuur terug te vinden zijn.
    IF v_pkg = 'planner' THEN
      UPDATE public.rides SET platform_invoice_id = new_invoice_id
      WHERE client_id = rec.user_id
        AND platform_invoice_id IS NULL
        AND id IN (
          SELECT r.id FROM public.rides r
          JOIN public.ride_assignments ra ON ra.ride_id = r.id
          JOIN public.invoices inv ON inv.id = ra.invoice_id
          WHERE r.client_id = rec.user_id
            AND inv.created_at >= period_s
            AND inv.created_at < period_e
        );
    END IF;

    UPDATE public.profiles SET last_platform_invoice_at = period_e WHERE id = rec.user_id;
    IF v_pkg = 'zzp' THEN
      UPDATE public.profiles SET last_escort_platform_invoice_at = period_e WHERE id = rec.user_id;
    ELSIF v_pkg = 'vloot' THEN
      UPDATE public.companies SET last_platform_invoice_at = period_e WHERE id = rec.company_id;
    END IF;

    count_made := count_made + 1;
  END LOOP;

  RETURN count_made;
END;
$function$;