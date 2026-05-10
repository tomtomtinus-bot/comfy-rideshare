ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_accepted_at timestamptz;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, approval_status, terms_accepted_at, privacy_accepted_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    'pending',
    CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted') = 'true' THEN now() ELSE NULL END,
    CASE WHEN (NEW.raw_user_meta_data->>'privacy_accepted') = 'true' THEN now() ELSE NULL END
  );

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