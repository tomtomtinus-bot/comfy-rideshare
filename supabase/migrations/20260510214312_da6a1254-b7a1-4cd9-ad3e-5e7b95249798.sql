-- Storage bucket for generated invoice PDFs (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Add pdf_path columns
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS pdf_path text;
ALTER TABLE public.platform_invoices ADD COLUMN IF NOT EXISTS pdf_path text;

-- RLS for storage.objects in 'invoices' bucket
-- Path convention: regular invoices => "regular/<invoice_id>.pdf"
--                  platform invoices => "platform/<invoice_id>.pdf"

CREATE POLICY "Invoice parties can read invoice PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      (storage.foldername(name))[1] = 'regular'
      AND EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.pdf_path = name
          AND (i.escort_id = auth.uid() OR i.client_id = auth.uid())
      )
    )
    OR (
      (storage.foldername(name))[1] = 'platform'
      AND EXISTS (
        SELECT 1 FROM public.platform_invoices pi
        WHERE pi.pdf_path = name
          AND pi.client_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Service role manages invoice PDFs"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'invoices' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'invoices' AND auth.role() = 'service_role');