
CREATE TABLE public.google_calendar_tokens (
  escort_id uuid PRIMARY KEY,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  calendar_id text NOT NULL DEFAULT 'primary',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escort manages own google tokens"
ON public.google_calendar_tokens
FOR ALL TO authenticated
USING (auth.uid() = escort_id)
WITH CHECK (auth.uid() = escort_id);

CREATE TRIGGER touch_google_tokens
BEFORE UPDATE ON public.google_calendar_tokens
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.ride_assignments
  ADD COLUMN google_event_id text;
