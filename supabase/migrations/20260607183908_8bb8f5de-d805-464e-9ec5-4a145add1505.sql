ALTER TABLE public.rides
  ALTER COLUMN ride_number SET DEFAULT public.generate_ride_number();
