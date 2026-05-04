
-- Korter factuurnummer met sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.platform_invoice_seq START 1;

ALTER TABLE public.invoices
  ALTER COLUMN invoice_number SET DEFAULT ('F' || to_char(now(), 'YY') || lpad(nextval('public.invoice_seq')::text, 5, '0'));

ALTER TABLE public.platform_invoices
  ALTER COLUMN invoice_number SET DEFAULT ('P' || to_char(now(), 'YY') || lpad(nextval('public.platform_invoice_seq')::text, 5, '0'));
