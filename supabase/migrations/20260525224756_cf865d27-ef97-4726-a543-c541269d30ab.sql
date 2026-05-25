-- Fix Function Search Path Mutable warning
-- Recreate set_updated_at_now with fixed search_path
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix Extension in Public warning
-- Move pg_net to dedicated extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Only move if we have permission; this is a Supabase-managed extension
DO $$
BEGIN
  ALTER EXTENSION pg_net SET SCHEMA extensions;
EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
  RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
END;
$$;