-- Admin can view & manage everything across the platform.
-- We use the existing has_role(uid, 'admin') security definer function.

-- profiles: admin sees and updates all
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- escort_profiles: admin updates all
CREATE POLICY "Admins manage all escort profiles" ON public.escort_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: admin can see, insert, update, delete
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- rides: admin manages all
CREATE POLICY "Admins manage all rides" ON public.rides
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ride_assignments: admin manages all
CREATE POLICY "Admins view all assignments" ON public.ride_assignments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert assignments" ON public.ride_assignments
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all assignments" ON public.ride_assignments
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- invoices + items: admin manages all
CREATE POLICY "Admins manage all invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all invoice items" ON public.invoice_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- platform invoices + items: admin manages all
CREATE POLICY "Admins manage all platform invoices" ON public.platform_invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all platform invoice items" ON public.platform_invoice_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- permits: admin sees all
CREATE POLICY "Admins view all permits" ON public.permits
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notifications: admin sees all (read-only oversight)
CREATE POLICY "Admins view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Helper: list all users with email (admin only).
-- Uses SECURITY DEFINER to read auth.users without exposing the table.
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  company_name text,
  phone text,
  created_at timestamptz,
  roles text[],
  anonymous_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    p.full_name,
    p.company_name,
    p.phone,
    u.created_at,
    ARRAY(SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = u.id),
    p.anonymous_id
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY u.created_at DESC;
END;
$$;

-- Helper: promote a user to admin by email
CREATE OR REPLACE FUNCTION public.admin_promote_user(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT id INTO v_uid FROM auth.users WHERE email = lower(_email) LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No user found for email %', _email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN v_uid;
END;
$$;

-- Helper: set a user's role (replaces existing client/escort roles, keeps admin)
CREATE OR REPLACE FUNCTION public.admin_set_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = _user_id
     AND role IN ('opdrachtgever', 'begeleider');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Helper: remove the admin role from a user
CREATE OR REPLACE FUNCTION public.admin_revoke_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF _user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;

  DELETE FROM public.user_roles
   WHERE user_id = _user_id AND role = 'admin';
END;
$$;