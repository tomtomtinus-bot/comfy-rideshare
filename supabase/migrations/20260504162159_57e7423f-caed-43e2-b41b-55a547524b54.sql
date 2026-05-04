CREATE OR REPLACE FUNCTION public.get_escort_busy_windows(_escort_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE(window_start timestamptz, window_end timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (r.scheduled_at - make_interval(mins => ra.travel_to_pickup_min)) AS window_start,
    (r.scheduled_at + make_interval(mins => COALESCE(
      (EXTRACT(EPOCH FROM (
        -- estimated ride duration in minutes from estimated_hours minus travel buffers
        (ra.estimated_hours * interval '1 hour')
      )) / 60)::int,
      0
    ))) AS window_end
  FROM public.ride_assignments ra
  JOIN public.rides r ON r.id = ra.ride_id
  WHERE ra.escort_id = _escort_id
    AND ra.status <> 'declined'
    AND r.status <> 'cancelled'
    AND r.scheduled_at >= (_from - interval '2 days')
    AND r.scheduled_at <= (_to + interval '2 days');
$$;

REVOKE ALL ON FUNCTION public.get_escort_busy_windows(uuid, timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_escort_busy_windows(uuid, timestamptz, timestamptz) TO authenticated;