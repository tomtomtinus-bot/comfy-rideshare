
-- Add permit_id to rides FIRST
ALTER TABLE public.rides ADD COLUMN permit_id UUID;

-- Permits table
CREATE TABLE public.permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  permit_number TEXT NOT NULL,
  reference TEXT,
  carrier TEXT,
  cargo TEXT,
  valid_from DATE,
  valid_to DATE,
  max_length_m NUMERIC,
  max_width_m NUMERIC,
  max_height_m NUMERIC,
  max_weight_kg NUMERIC,
  pdf_path TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rides
  ADD CONSTRAINT rides_permit_id_fkey FOREIGN KEY (permit_id) REFERENCES public.permits(id) ON DELETE SET NULL;

ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own permits"
  ON public.permits FOR ALL TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Escort sees permits on assigned rides"
  ON public.permits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    WHERE r.permit_id = permits.id AND ra.escort_id = auth.uid()
  ));

CREATE TRIGGER permits_touch_updated_at
  BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Permit routes
CREATE TABLE public.permit_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  route_index INTEGER NOT NULL,
  loaded BOOLEAN NOT NULL DEFAULT true,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permit_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own permit routes"
  ON public.permit_routes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.permits p WHERE p.id = permit_routes.permit_id AND p.client_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.permits p WHERE p.id = permit_routes.permit_id AND p.client_id = auth.uid()));

CREATE POLICY "Escort sees permit routes on assigned rides"
  ON public.permit_routes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rides r
    JOIN public.ride_assignments ra ON ra.ride_id = r.id
    WHERE r.permit_id = permit_routes.permit_id AND ra.escort_id = auth.uid()
  ));

-- Storage bucket for permit PDFs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('permits', 'permits', false);

CREATE POLICY "Client uploads own permit pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'permits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Client reads own permit pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'permits' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.permits p
        JOIN public.rides r ON r.permit_id = p.id
        JOIN public.ride_assignments ra ON ra.ride_id = r.id
        WHERE p.pdf_path = storage.objects.name AND ra.escort_id = auth.uid()
      )
    )
  );

CREATE POLICY "Client updates own permit pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'permits' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Client deletes own permit pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'permits' AND auth.uid()::text = (storage.foldername(name))[1]);
