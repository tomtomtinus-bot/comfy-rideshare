
-- 1. anonymous_id op profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anonymous_id TEXT UNIQUE
  DEFAULT ('C' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'));

-- backfill bestaande rijen
UPDATE public.profiles
SET anonymous_id = 'C' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')
WHERE anonymous_id IS NULL;

-- 2. app_fee op rides
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS app_fee NUMERIC NOT NULL DEFAULT 0;

-- 3. assignment status enum
DO $$ BEGIN
  CREATE TYPE public.assignment_status AS ENUM ('invited','accepted','declined','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS status public.assignment_status NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS responds_by TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes'),
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- 4. update handle_new_user to also set anonymous_id implicitly (default does that). 
--    No change needed since DEFAULT handles it.

-- 5. Allow opdrachtgever to update assignments on own rides (e.g. cancel)
DROP POLICY IF EXISTS "Client updates assignments on own rides" ON public.ride_assignments;
CREATE POLICY "Client updates assignments on own rides"
ON public.ride_assignments
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.client_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.client_id = auth.uid()));

-- 6. Realtime
ALTER TABLE public.ride_assignments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_assignments;
