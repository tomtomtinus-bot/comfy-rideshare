
-- Add attachments column to rides
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- RLS policies for ride-attachments bucket
-- Path convention: {client_id}/{ride_id_or_temp}/{filename}

CREATE POLICY "Client manages own ride attachments"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'ride-attachments' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'ride-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins manage all ride attachments"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'ride-attachments' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'ride-attachments' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Escort reads ride attachments on accepted assignment"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ride-attachments'
  AND EXISTS (
    SELECT 1 FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.escort_id = auth.uid()
      AND ra.status = 'accepted'
      AND r.client_id::text = (storage.foldername(name))[1]
      AND r.id::text = (storage.foldername(name))[2]
  )
);
