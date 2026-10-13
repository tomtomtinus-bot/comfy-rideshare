CREATE OR REPLACE FUNCTION public.check_escort_conflicts(_escort_id uuid, _at timestamptz, _exclude_ride uuid DEFAULT NULL)
RETURNS TABLE(ride_label text, scheduled_at timestamptz, own boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN r.client_id = auth.uid() OR ra.escort_id = auth.uid() THEN r.ride_number || ' ' || r.pickup_city || ' → ' || r.dropoff_city ELSE 'Rit bij een andere planner' END,
         r.scheduled_at, (r.client_id = auth.uid())
  FROM ride_assignments ra JOIN rides r ON r.id = ra.ride_id
  WHERE ra.escort_id = _escort_id
    AND (auth.uid() = _escort_id OR is_relation(auth.uid(), _escort_id))
    AND ra.status IN ('invited','accepted')
    AND r.status NOT IN ('cancelled','completed')
    AND (_exclude_ride IS NULL OR r.id <> _exclude_ride)
    AND r.scheduled_at < _at + interval '3 hours'
    AND r.scheduled_at + interval '3 hours' > _at
  ORDER BY r.scheduled_at;
$$;

CREATE OR REPLACE FUNCTION public.get_ride_crew(_ride_id uuid)
RETURNS TABLE(escort_id uuid, name text, phone text, escort_role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ra.escort_id, COALESCE(NULLIF(p.full_name,''), ep.company_name, 'Begeleider'), p.phone, ra.escort_role
  FROM ride_assignments ra
  JOIN rides r ON r.id = ra.ride_id
  LEFT JOIN profiles p ON p.id = ra.escort_id
  LEFT JOIN escort_profiles ep ON ep.id = ra.escort_id
  WHERE ra.ride_id = _ride_id AND ra.status = 'accepted'
    AND (r.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM ride_assignments me WHERE me.ride_id = _ride_id AND me.escort_id = auth.uid() AND me.status = 'accepted'))
  ORDER BY ra.escort_role NULLS LAST;
$$;
REVOKE EXECUTE ON FUNCTION public.get_ride_crew(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_ride_crew(uuid) TO authenticated;