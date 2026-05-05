
DO $$ BEGIN
  CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.profiles SET approval_status = 'approved', approved_at = COALESCE(approved_at, now())
WHERE approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = _user_id AND approval_status = 'approved'
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, approval_status)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', 'pending');

  IF NEW.raw_user_meta_data->>'role' IN ('opdrachtgever', 'begeleider') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'role')::public.app_role);
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'opdrachtgever');
  END IF;

  IF NEW.raw_user_meta_data->>'role' = 'begeleider' THEN
    INSERT INTO public.escort_profiles (id, base_city, base_lat, base_lng, hourly_rate)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'base_city', 'Utrecht'),
      COALESCE((NEW.raw_user_meta_data->>'base_lat')::DOUBLE PRECISION, 52.0907),
      COALESCE((NEW.raw_user_meta_data->>'base_lng')::DOUBLE PRECISION, 5.1214),
      COALESCE((NEW.raw_user_meta_data->>'hourly_rate')::NUMERIC, 35)
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "Client manages own rides" ON public.rides;
CREATE POLICY "Client views own rides"
  ON public.rides FOR SELECT TO authenticated
  USING (auth.uid() = client_id);
CREATE POLICY "Client updates own rides"
  ON public.rides FOR UPDATE TO authenticated
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Client deletes own rides"
  ON public.rides FOR DELETE TO authenticated
  USING (auth.uid() = client_id);
CREATE POLICY "Approved client creates rides"
  ON public.rides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id AND public.is_approved(auth.uid()));

DROP POLICY IF EXISTS "Escort updates own assignment hours" ON public.ride_assignments;
CREATE POLICY "Approved escort updates own assignments"
  ON public.ride_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = escort_id AND public.is_approved(auth.uid()))
  WITH CHECK (auth.uid() = escort_id AND public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_approve_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.profiles
     SET approval_status = 'approved',
         approved_at = now(),
         approved_by = auth.uid(),
         rejection_reason = NULL
   WHERE id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_user(_user_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  UPDATE public.profiles
     SET approval_status = 'rejected',
         approved_at = NULL,
         approved_by = auth.uid(),
         rejection_reason = _reason
   WHERE id = _user_id;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_list_users();
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, email text, full_name text, company_name text,
  phone text, created_at timestamptz, roles text[], anonymous_id text,
  approval_status text, approved_at timestamptz, rejection_reason text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
    p.anonymous_id,
    p.approval_status::text,
    p.approved_at,
    p.rejection_reason
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  ORDER BY
    CASE WHEN p.approval_status = 'pending' THEN 0 ELSE 1 END,
    u.created_at DESC;
END;
$$;
