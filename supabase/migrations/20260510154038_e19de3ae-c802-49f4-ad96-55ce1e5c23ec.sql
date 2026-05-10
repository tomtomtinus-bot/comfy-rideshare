ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS be_escort_type text NULL CHECK (be_escort_type IN ('type1','type2'));