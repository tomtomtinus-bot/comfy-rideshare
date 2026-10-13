CREATE POLICY "Escort deletes ride attachments on accepted assignment"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'ride-attachments'
  AND EXISTS (
    SELECT 1 FROM public.ride_assignments ra
    JOIN public.rides r ON r.id = ra.ride_id
    WHERE ra.escort_id = auth.uid() AND ra.status = 'accepted'
      AND r.client_id::text = (storage.foldername(name))[1]
      AND r.id::text = (storage.foldername(name))[2]
  )
);