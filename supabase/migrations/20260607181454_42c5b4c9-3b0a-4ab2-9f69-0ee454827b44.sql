CREATE OR REPLACE FUNCTION public.is_assigned_escort(_ride_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.ride_assignments
    WHERE ride_id = _ride_id
      AND escort_id = _user_id
      AND status = 'accepted'::assignment_status
  )
$function$;