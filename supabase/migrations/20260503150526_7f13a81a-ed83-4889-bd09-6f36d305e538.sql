-- ROLES
CREATE TYPE public.app_role AS ENUM ('opdrachtgever', 'begeleider', 'admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users see own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ESCORT PROFILES
CREATE TABLE public.escort_profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymous_id TEXT NOT NULL UNIQUE DEFAULT ('A' || lpad((floor(random()*9000)+1000)::int::text, 4, '0')),
  base_city TEXT NOT NULL,
  base_lat DOUBLE PRECISION NOT NULL,
  base_lng DOUBLE PRECISION NOT NULL,
  hourly_rate NUMERIC(6,2) NOT NULL DEFAULT 35.00,
  countries TEXT[] NOT NULL DEFAULT ARRAY['Nederland']::TEXT[],
  languages TEXT[] NOT NULL DEFAULT ARRAY['Nederlands']::TEXT[],
  surcharges JSONB NOT NULL DEFAULT '[]'::JSONB,
  rating NUMERIC(2,1) NOT NULL DEFAULT 5.0,
  rides_completed INTEGER NOT NULL DEFAULT 0,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.escort_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view escorts" ON public.escort_profiles
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Begeleider manages own escort profile" ON public.escort_profiles
FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- RIDES
CREATE TYPE public.ride_status AS ENUM ('open', 'matched', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_city TEXT NOT NULL,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  num_escorts INTEGER NOT NULL DEFAULT 1 CHECK (num_escorts BETWEEN 1 AND 5),
  notes TEXT,
  status public.ride_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client manages own rides" ON public.rides
FOR ALL TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);

-- RIDE ASSIGNMENTS (created BEFORE the policy on rides that references it)
CREATE TABLE public.ride_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  escort_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  travel_to_pickup_min INTEGER NOT NULL DEFAULT 0,
  travel_back_home_min INTEGER NOT NULL DEFAULT 0,
  estimated_hours NUMERIC(5,2),
  estimated_cost NUMERIC(8,2),
  departed_base_at TIMESTAMPTZ,
  returned_base_at TIMESTAMPTZ,
  actual_hours NUMERIC(5,2),
  actual_cost NUMERIC(8,2),
  hours_notes TEXT,
  hours_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, escort_id)
);
ALTER TABLE public.ride_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escort sees rides assigned" ON public.rides
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.ride_assignments ra WHERE ra.ride_id = rides.id AND ra.escort_id = auth.uid()));

CREATE POLICY "Client sees assignments on own rides" ON public.ride_assignments
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.client_id = auth.uid()));

CREATE POLICY "Client creates assignments on own rides" ON public.ride_assignments
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.rides r WHERE r.id = ride_id AND r.client_id = auth.uid()));

CREATE POLICY "Escort sees own assignments" ON public.ride_assignments
FOR SELECT TO authenticated USING (auth.uid() = escort_id);

CREATE POLICY "Escort updates own assignment hours" ON public.ride_assignments
FOR UPDATE TO authenticated USING (auth.uid() = escort_id) WITH CHECK (auth.uid() = escort_id);

-- TRIGGER: auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone');

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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER escort_profiles_touch BEFORE UPDATE ON public.escort_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER rides_touch BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();