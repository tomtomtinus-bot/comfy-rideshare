-- 1) Sequence-tabel per (scope, user, jaar)
CREATE TABLE IF NOT EXISTS public.invoice_number_sequences (
  scope text NOT NULL,
  user_id uuid NOT NULL,
  year smallint NOT NULL,
  last_seq integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, user_id, year)
);

ALTER TABLE public.invoice_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage invoice sequences" ON public.invoice_number_sequences;
CREATE POLICY "Admins manage invoice sequences"
ON public.invoice_number_sequences
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Nummergenerator: ANONIEM-JJNNN (3-digit reeks)
CREATE OR REPLACE FUNCTION public.next_invoice_number(
  _scope text,
  _user_id uuid,
  _anonymous_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year smallint := EXTRACT(year FROM now())::smallint;
  _yy text := to_char(now(), 'YY');
  _seq integer;
  _anon text := COALESCE(NULLIF(_anonymous_id, ''), 'X0000');
BEGIN
  INSERT INTO public.invoice_number_sequences (scope, user_id, year, last_seq, updated_at)
  VALUES (_scope, _user_id, _year, 1, now())
  ON CONFLICT (scope, user_id, year)
  DO UPDATE SET last_seq = invoice_number_sequences.last_seq + 1,
                updated_at = now()
  RETURNING last_seq INTO _seq;

  RETURN _anon || '-' || _yy || lpad(_seq::text, 3, '0');
END;
$$;

-- 3) Trigger voor invoices (begeleider-facturen)
CREATE OR REPLACE FUNCTION public.set_escort_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _anon text;
BEGIN
  IF NEW.invoice_number IS NULL
     OR NEW.invoice_number = ''
     OR NEW.invoice_number ~ '^F[0-9]'
  THEN
    SELECT anonymous_id INTO _anon
    FROM public.escort_profiles
    WHERE id = NEW.escort_id;

    NEW.invoice_number := public.next_invoice_number('escort', NEW.escort_id, _anon);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_escort_invoice_number ON public.invoices;
CREATE TRIGGER trg_set_escort_invoice_number
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_escort_invoice_number();

-- 4) Trigger voor platform_invoices (platform/klant-facturen)
CREATE OR REPLACE FUNCTION public.set_platform_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _anon text;
BEGIN
  IF NEW.invoice_number IS NULL
     OR NEW.invoice_number = ''
     OR NEW.invoice_number ~ '^P[0-9]'
  THEN
    SELECT anonymous_id INTO _anon
    FROM public.profiles
    WHERE id = NEW.client_id;

    NEW.invoice_number := public.next_invoice_number('platform', NEW.client_id, _anon);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_platform_invoice_number ON public.platform_invoices;
CREATE TRIGGER trg_set_platform_invoice_number
BEFORE INSERT ON public.platform_invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_platform_invoice_number();

-- 5) Defaults verwijderen zodat trigger de baas is (en geen sequence-nummer wordt verspild)
ALTER TABLE public.invoices ALTER COLUMN invoice_number DROP DEFAULT;
ALTER TABLE public.platform_invoices ALTER COLUMN invoice_number DROP DEFAULT;