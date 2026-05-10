CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.ride_assignments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 4000),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_assignment_created ON public.messages(assignment_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages(assignment_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: is caller a participant of this assignment (client or accepted escort)?
CREATE OR REPLACE FUNCTION public.is_assignment_participant(_assignment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.ride_assignments ra
      JOIN public.rides r ON r.id = ra.ride_id
     WHERE ra.id = _assignment_id
       AND ra.status = 'accepted'
       AND (r.client_id = _user_id OR ra.escort_id = _user_id)
  );
$$;

CREATE POLICY "Participants can read messages"
ON public.messages FOR SELECT
TO authenticated
USING (public.is_assignment_participant(assignment_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_assignment_participant(assignment_id, auth.uid())
);

CREATE POLICY "Recipients can mark as read"
ON public.messages FOR UPDATE
TO authenticated
USING (
  public.is_assignment_participant(assignment_id, auth.uid())
  AND sender_id <> auth.uid()
)
WITH CHECK (
  public.is_assignment_participant(assignment_id, auth.uid())
  AND sender_id <> auth.uid()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;