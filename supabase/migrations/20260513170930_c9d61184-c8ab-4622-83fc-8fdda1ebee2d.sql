-- pg_net voor async HTTP-calls vanuit DB
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Trigger function: roept charge-platform-invoice aan na INSERT van platform_invoices
CREATE OR REPLACE FUNCTION public.trigger_charge_platform_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_service_key text;
BEGIN
  -- Alleen voor nog openstaande facturen
  IF NEW.status <> 'open' THEN
    RETURN NEW;
  END IF;

  v_url := 'https://qsiduhrmgunvipxelgpe.supabase.co/functions/v1/charge-platform-invoice';
  v_service_key := current_setting('app.settings.service_role_key', true);

  -- Service role key staat niet als GUC; we gebruiken anon-aanroep en
  -- de edge function gebruikt zijn eigen service-role key intern.
  PERFORM extensions.http_post(
    url := v_url,
    body := jsonb_build_object('invoice_id', NEW.id::text),
    params := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nooit de invoice-aanmaak laten falen door betaalpoging
  RAISE WARNING 'trigger_charge_platform_invoice failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_invoices_auto_charge ON public.platform_invoices;
CREATE TRIGGER platform_invoices_auto_charge
  AFTER INSERT ON public.platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_charge_platform_invoice();