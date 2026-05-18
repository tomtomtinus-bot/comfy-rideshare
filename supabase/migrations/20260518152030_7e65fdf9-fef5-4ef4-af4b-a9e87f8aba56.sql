
-- ============ Companies ============
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  name text NOT NULL,
  seat_limit integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('planner','driver')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX idx_company_members_company ON public.company_members(company_id);
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'driver' CHECK (role IN ('driver')),
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_invitations_company ON public.company_invitations(company_id);
CREATE INDEX idx_company_invitations_email ON public.company_invitations(lower(email));
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- ============ ride_assignments uitbreidingen ============
ALTER TABLE public.ride_assignments
  ADD COLUMN IF NOT EXISTS assigned_driver_id uuid,
  ADD COLUMN IF NOT EXISTS hours_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS hours_approved_by uuid;

CREATE INDEX IF NOT EXISTS idx_ride_assignments_driver ON public.ride_assignments(assigned_driver_id);

-- ============ Helper functies ============
CREATE OR REPLACE FUNCTION public.get_user_company_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.company_members
   WHERE user_id = _uid AND status = 'active' LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_company_planner(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
     WHERE user_id = _uid AND role = 'planner' AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_driver_of(_driver uuid, _planner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.company_members p
      JOIN public.company_members d ON d.company_id = p.company_id
     WHERE p.user_id = _planner AND p.role = 'planner' AND p.status = 'active'
       AND d.user_id = _driver  AND d.role = 'driver'  AND d.status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_same_company(_u1 uuid, _u2 uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.get_user_company_id(_u1) IS NOT NULL
     AND public.get_user_company_id(_u1) = public.get_user_company_id(_u2)
$$;

-- ============ RLS: companies ============
CREATE POLICY "Owner manages own company" ON public.companies
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));
CREATE POLICY "Admins manage companies" ON public.companies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ RLS: company_members ============
CREATE POLICY "User views own membership" ON public.company_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Planner views company members" ON public.company_members
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.is_company_planner(auth.uid()));
CREATE POLICY "Planner manages company members" ON public.company_members
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_members.company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Admins manage company members" ON public.company_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ RLS: company_invitations ============
CREATE POLICY "Planner manages invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_invitations.company_id AND c.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_invitations.company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Admins manage invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- ============ ride_assignments: extra policies voor drivers ============
CREATE POLICY "Driver sees assigned rides" ON public.ride_assignments
  FOR SELECT TO authenticated
  USING (assigned_driver_id = auth.uid());

CREATE POLICY "Driver updates own hours on assigned rides" ON public.ride_assignments
  FOR UPDATE TO authenticated
  USING (assigned_driver_id = auth.uid())
  WITH CHECK (assigned_driver_id = auth.uid());

-- ============ Driver-veilige view (zonder financiele velden) ============
CREATE OR REPLACE VIEW public.driver_ride_assignments_view
WITH (security_invoker = on) AS
SELECT
  ra.id,
  ra.ride_id,
  ra.escort_id,
  ra.assigned_driver_id,
  ra.status,
  ra.invited_at,
  ra.responds_by,
  ra.responded_at,
  ra.departed_base_at,
  ra.returned_base_at,
  ra.actual_hours,
  ra.hours_submitted_at,
  ra.hours_approved_at,
  ra.hours_notes,
  ra.google_event_id,
  ra.travel_to_pickup_min,
  ra.travel_back_home_min,
  ra.created_at
FROM public.ride_assignments ra;

-- ============ updated_at triggers ============
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

-- ============ Auto-create solo company voor bestaande begeleiders ============
INSERT INTO public.companies (owner_id, name, seat_limit)
SELECT ur.user_id,
       COALESCE(p.company_name, p.full_name, 'Bedrijf') ,
       1
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
 WHERE ur.role = 'begeleider'
   AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.owner_id = ur.user_id)
ON CONFLICT DO NOTHING;

INSERT INTO public.company_members (company_id, user_id, role)
SELECT c.id, c.owner_id, 'planner'
  FROM public.companies c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.company_members m
     WHERE m.user_id = c.owner_id
  )
ON CONFLICT DO NOTHING;
