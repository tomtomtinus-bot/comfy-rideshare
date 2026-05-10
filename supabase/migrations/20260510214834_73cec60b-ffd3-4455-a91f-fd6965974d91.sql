
-- Public branding bucket for logo (read-only public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Public read branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins manage branding"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- Trigger function: enqueue PDF generation via pg_net
CREATE OR REPLACE FUNCTION public.enqueue_invoice_pdf()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_type text;
BEGIN
  IF TG_TABLE_NAME = 'platform_invoices' THEN
    v_type := 'platform';
  ELSE
    v_type := 'regular';
  END IF;

  PERFORM net.http_post(
    url := 'https://qsiduhrmgunvipxelgpe.supabase.co/functions/v1/generate-invoice-pdf',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('invoice_id', NEW.id, 'type', v_type)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_pdf ON public.invoices;
CREATE TRIGGER trg_invoices_pdf
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.enqueue_invoice_pdf();

DROP TRIGGER IF EXISTS trg_platform_invoices_pdf ON public.platform_invoices;
CREATE TRIGGER trg_platform_invoices_pdf
AFTER INSERT ON public.platform_invoices
FOR EACH ROW EXECUTE FUNCTION public.enqueue_invoice_pdf();
