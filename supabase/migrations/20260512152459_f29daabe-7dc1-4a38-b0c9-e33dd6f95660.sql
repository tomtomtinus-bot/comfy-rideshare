CREATE TABLE public.client_excluded_escorts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  escort_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id, escort_id)
);

CREATE INDEX idx_client_excluded_escorts_client ON public.client_excluded_escorts(client_id);
CREATE INDEX idx_client_excluded_escorts_escort ON public.client_excluded_escorts(escort_id);

ALTER TABLE public.client_excluded_escorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own excluded escorts"
  ON public.client_excluded_escorts
  FOR ALL
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins view all excluded escorts"
  ON public.client_excluded_escorts
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all excluded escorts"
  ON public.client_excluded_escorts
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));