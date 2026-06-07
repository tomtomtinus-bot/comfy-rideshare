
-- 1. Tighten realtime topic policies: replace loose LIKE %uid% with exact known topic shapes
DROP POLICY IF EXISTS "Auth users read own realtime topics" ON realtime.messages;
DROP POLICY IF EXISTS "Auth users write own realtime topics" ON realtime.messages;

CREATE POLICY "Auth users read own realtime topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  topic = (auth.uid())::text
  OR topic = 'escort-' || (auth.uid())::text
  OR topic = 'notif-bell-' || (auth.uid())::text
  OR topic = 'notifications-' || (auth.uid())::text
  OR topic LIKE 'subs-' || (auth.uid())::text || '-%'
  OR (topic LIKE 'messages:%' AND public.is_assignment_participant(
        (NULLIF(split_part(topic, ':', 2), ''))::uuid, auth.uid()))
);

CREATE POLICY "Auth users write own realtime topics"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  topic = (auth.uid())::text
  OR topic = 'escort-' || (auth.uid())::text
  OR topic = 'notif-bell-' || (auth.uid())::text
  OR topic = 'notifications-' || (auth.uid())::text
  OR topic LIKE 'subs-' || (auth.uid())::text || '-%'
  OR (topic LIKE 'messages:%' AND public.is_assignment_participant(
        (NULLIF(split_part(topic, ':', 2), ''))::uuid, auth.uid()))
);

-- 2. Permits storage: escorts only see PDFs for accepted assignments
DROP POLICY IF EXISTS "Client reads own permit pdfs" ON storage.objects;
CREATE POLICY "Client reads own permit pdfs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'permits'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM permits p
      JOIN rides r ON r.permit_id = p.id
      JOIN ride_assignments ra ON ra.ride_id = r.id
      WHERE p.pdf_path = storage.objects.name
        AND ra.escort_id = auth.uid()
        AND ra.status = 'accepted'::assignment_status
    )
  )
);

-- 3. Revoke anon execute on SECURITY DEFINER function
REVOKE EXECUTE ON FUNCTION public.generate_platform_invoices(boolean) FROM PUBLIC, anon;
