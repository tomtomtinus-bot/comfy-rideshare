ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'nl'
CHECK (preferred_language IN ('nl','en','de','fr'));