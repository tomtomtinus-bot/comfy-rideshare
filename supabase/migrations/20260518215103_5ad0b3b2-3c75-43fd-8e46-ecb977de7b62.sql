ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS xml_path text;
ALTER TABLE public.platform_invoices ADD COLUMN IF NOT EXISTS xml_path text;