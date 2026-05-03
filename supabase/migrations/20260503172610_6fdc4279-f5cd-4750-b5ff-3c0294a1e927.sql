
-- Add certificate files column
ALTER TABLE public.escort_profiles
  ADD COLUMN IF NOT EXISTS certificate_files text[] NOT NULL DEFAULT '{}';

-- Availability table (weekly recurring schedule)
CREATE TABLE IF NOT EXISTS public.escort_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escort_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escort_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view availability"
  ON public.escort_availability FOR SELECT TO authenticated USING (true);

CREATE POLICY "Escort manages own availability"
  ON public.escort_availability FOR ALL TO authenticated
  USING (auth.uid() = escort_id) WITH CHECK (auth.uid() = escort_id);

CREATE INDEX IF NOT EXISTS idx_escort_availability_escort ON public.escort_availability(escort_id);

-- Storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('escort-certificates', 'escort-certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Escort reads own certificates"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'escort-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort uploads own certificates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'escort-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort updates own certificates"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'escort-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Escort deletes own certificates"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'escort-certificates' AND auth.uid()::text = (storage.foldername(name))[1]);
