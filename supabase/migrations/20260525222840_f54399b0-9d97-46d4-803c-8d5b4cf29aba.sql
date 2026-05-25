-- Restrict Realtime channel subscriptions via RLS on realtime.messages.
-- Topics used in this app:
--   - "escort-<uid>", "notif-bell-<uid>", "notifications-<uid>", "subs-<uid>-..."
--     → allowed when the topic contains the caller's auth.uid()
--   - "messages:<assignment_id>"
--     → allowed when the caller is a participant of that assignment

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users read own realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Auth users write own realtime topics" ON realtime.messages;

CREATE POLICY "Auth users read own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- User-scoped topics: topic contains the caller's uid
  (topic LIKE '%' || auth.uid()::text || '%')
  OR
  -- Assignment chat topics: messages:<uuid>
  (
    topic LIKE 'messages:%'
    AND public.is_assignment_participant(
      NULLIF(split_part(topic, ':', 2), '')::uuid,
      auth.uid()
    )
  )
);

CREATE POLICY "Auth users write own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (topic LIKE '%' || auth.uid()::text || '%')
  OR
  (
    topic LIKE 'messages:%'
    AND public.is_assignment_participant(
      NULLIF(split_part(topic, ':', 2), '')::uuid,
      auth.uid()
    )
  )
);