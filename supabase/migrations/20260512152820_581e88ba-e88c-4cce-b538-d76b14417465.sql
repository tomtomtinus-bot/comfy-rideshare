UPDATE public.client_excluded_escorts SET reason = '(geen reden opgegeven)' WHERE reason IS NULL OR btrim(reason) = '';
ALTER TABLE public.client_excluded_escorts ALTER COLUMN reason SET NOT NULL;
ALTER TABLE public.client_excluded_escorts ADD CONSTRAINT client_excluded_escorts_reason_not_blank CHECK (btrim(reason) <> '');