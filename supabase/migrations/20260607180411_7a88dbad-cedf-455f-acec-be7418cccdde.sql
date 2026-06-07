CREATE OR REPLACE FUNCTION public.get_escort_busy_windows(_escort_id uuid, _from timestamp with time zone, _to timestamp with time zone)
RETURNS TABLE(window_start timestamp with time zone, window_end timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    (r.scheduled_at - make_interval(mins => ra.travel_to_pickup_min)) AS window_start,
    (r.scheduled_at + make_interval(mins => COALESCE(
      (EXTRACT(EPOCH FROM ((ra.estimated_hours * interval '1 hour'))) / 60)::int,
      0
    ))) AS window_end
  FROM public.ride_assignments ra
  JOIN public.rides r ON r.id = ra.ride_id
  WHERE ra.escort_id = _escort_id
    AND ra.status IN ('invited','accepted')
    AND r.status NOT IN ('cancelled','completed')
    AND r.scheduled_at >= (_from - interval '2 days')
    AND r.scheduled_at <= (_to + interval '2 days');
$function$;