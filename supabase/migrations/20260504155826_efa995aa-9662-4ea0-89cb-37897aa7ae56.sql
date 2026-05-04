INSERT INTO storage.buckets (id, name, public)
VALUES ('fuel-staffels', 'fuel-staffels', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Escort uploads own fuel staffel"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'fuel-staffels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort reads own fuel staffel"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'fuel-staffels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort updates own fuel staffel"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'fuel-staffels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort deletes own fuel staffel"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'fuel-staffels' AND auth.uid()::text = (storage.foldername(name))[1]);