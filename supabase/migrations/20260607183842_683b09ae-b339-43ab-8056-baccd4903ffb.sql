-- Ride number system: VC + 2-digit year + 5-digit sequence
-- 2026 seeded at 10000 (existing rides), new years reset to 00000

CREATE TABLE IF NOT EXISTS public.ride_number_sequences (
  year smallint PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ride_number_sequences TO authenticated;
GRANT ALL ON public.ride_number_sequences TO service_role;

ALTER TABLE public.ride_number_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ride number sequences"
ON public.ride_number_sequences FOR ALL
TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

-- Seed 2026 at 10000 so first new ride becomes VC2610001
INSERT INTO public.ride_number_sequences (year, last_seq)
VALUES (2026, 10000)
ON CONFLICT (year) DO NOTHING;

-- Add ride_number column to rides
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS ride_number text UNIQUE;

-- Generator function
CREATE OR REPLACE FUNCTION public.generate_ride_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  yr smallint := EXTRACT(YEAR FROM now())::smallint;
  yy text := lpad((yr % 100)::text, 2, '0');
  seq integer;
BEGIN
  INSERT INTO public.ride_number_sequences (year, last_seq)
  VALUES (yr, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = ride_number_sequences.last_seq + 1,
        updated_at = now()
  RETURNING last_seq INTO seq;

  RETURN 'VC' || yy || lpad(seq::text, 5, '0');
END;
$$;

-- Trigger to set ride_number on insert
CREATE OR REPLACE FUNCTION public.set_ride_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ride_number IS NULL OR NEW.ride_number = '' THEN
    NEW.ride_number := public.generate_ride_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_ride_number ON public.rides;
CREATE TRIGGER trg_set_ride_number
  BEFORE INSERT ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_ride_number();

-- Backfill existing rides with VC26##### numbers (oldest first)
DO $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN SELECT id FROM public.rides WHERE ride_number IS NULL ORDER BY scheduled_at ASC, created_at ASC LOOP
    n := n + 1;
    UPDATE public.rides SET ride_number = 'VC26' || lpad(n::text, 5, '0') WHERE id = r.id;
  END LOOP;
  -- Bump sequence past backfilled numbers
  IF n > 0 THEN
    UPDATE public.ride_number_sequences
      SET last_seq = GREATEST(last_seq, n), updated_at = now()
      WHERE year = 2026;
  END IF;
END $$;

ALTER TABLE public.rides ALTER COLUMN ride_number SET NOT NULL;
