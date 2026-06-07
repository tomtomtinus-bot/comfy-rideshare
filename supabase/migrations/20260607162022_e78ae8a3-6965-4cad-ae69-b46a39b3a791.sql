
-- 1. Verwijder de te ruime UPDATE policies
DROP POLICY IF EXISTS "Client marks invoice paid" ON public.invoices;
DROP POLICY IF EXISTS "Client marks own platform invoice paid" ON public.platform_invoices;

-- 2. Trigger functie: blokkeer wijzigingen aan gevoelige kolommen tenzij service_role
CREATE OR REPLACE FUNCTION public.guard_invoice_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Alleen de server (service_role via webhooks / edge functions) mag deze
  -- betaal-gerelateerde velden wijzigen.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Wijzigen van status is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'Wijzigen van total_amount is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Wijzigen van paid_at is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Variant met extra stripe_payment_intent_id check (alleen platform_invoices heeft die kolom)
CREATE OR REPLACE FUNCTION public.guard_platform_invoice_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Wijzigen van status is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount THEN
    RAISE EXCEPTION 'Wijzigen van total_amount is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
    RAISE EXCEPTION 'Wijzigen van paid_at is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.stripe_payment_intent_id IS DISTINCT FROM OLD.stripe_payment_intent_id THEN
    RAISE EXCEPTION 'Wijzigen van stripe_payment_intent_id is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id THEN
    RAISE EXCEPTION 'Wijzigen van stripe_session_id is voorbehouden aan de server (service_role).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Triggers koppelen
DROP TRIGGER IF EXISTS guard_invoices_sensitive_cols ON public.invoices;
CREATE TRIGGER guard_invoices_sensitive_cols
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_invoice_sensitive_columns();

DROP TRIGGER IF EXISTS guard_platform_invoices_sensitive_cols ON public.platform_invoices;
CREATE TRIGGER guard_platform_invoices_sensitive_cols
  BEFORE UPDATE ON public.platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_platform_invoice_sensitive_columns();
