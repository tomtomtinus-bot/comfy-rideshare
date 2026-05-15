
CREATE TABLE public.email_change_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  current_email text NOT NULL,
  new_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_change_requests_user ON public.email_change_requests(user_id);
CREATE INDEX idx_email_change_requests_status ON public.email_change_requests(status);

ALTER TABLE public.email_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email change requests"
ON public.email_change_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own email change requests"
ON public.email_change_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins manage all email change requests"
ON public.email_change_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_email_change_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_change_requests_updated_at
BEFORE UPDATE ON public.email_change_requests
FOR EACH ROW EXECUTE FUNCTION public.set_email_change_requests_updated_at();
