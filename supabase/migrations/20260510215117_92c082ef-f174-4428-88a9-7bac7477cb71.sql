
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
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaWR1aHJtZ3VudmlweGVsZ3BlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MDc4NTksImV4cCI6MjA5MzM4Mzg1OX0.UOessk3Ssro3hlC1QT9_VLcwNkCPJy72m2Pi3tqfZkQ'
    ),
    body := jsonb_build_object('invoice_id', NEW.id, 'type', v_type)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_invoice_pdf() FROM PUBLIC, anon, authenticated;
