
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.escort_scheduled_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escort_id uuid NOT NULL,
  address text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_loc_time_valid CHECK (end_at > start_at)
);

CREATE INDEX idx_escort_scheduled_locations_escort ON public.escort_scheduled_locations(escort_id);
CREATE INDEX idx_escort_scheduled_locations_window ON public.escort_scheduled_locations(start_at, end_at);

ALTER TABLE public.escort_scheduled_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escort manages own scheduled locations"
ON public.escort_scheduled_locations
FOR ALL TO authenticated
USING (auth.uid() = escort_id)
WITH CHECK (auth.uid() = escort_id);

CREATE POLICY "Admins manage all scheduled locations"
ON public.escort_scheduled_locations
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated view scheduled locations"
ON public.escort_scheduled_locations
FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER trg_escort_scheduled_locations_updated_at
BEFORE UPDATE ON public.escort_scheduled_locations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
