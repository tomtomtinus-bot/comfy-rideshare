
CREATE OR REPLACE FUNCTION public.ensure_company_for_escort()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_company_id uuid;
  v_name text;
BEGIN
  IF NEW.role <> 'begeleider' THEN RETURN NEW; END IF;
  -- Skip als al lid van bedrijf.
  IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(company_name, full_name, 'Bedrijf') INTO v_name
    FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.companies (owner_id, name, seat_limit)
    VALUES (NEW.user_id, COALESCE(v_name, 'Bedrijf'), 1)
    ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_company_id;
  INSERT INTO public.company_members (company_id, user_id, role, status)
    VALUES (v_company_id, NEW.user_id, 'planner', 'active')
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_company_for_escort ON public.user_roles;
CREATE TRIGGER trg_ensure_company_for_escort
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_company_for_escort();
