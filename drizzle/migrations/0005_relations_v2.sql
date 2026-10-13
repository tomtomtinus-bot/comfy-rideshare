CREATE OR REPLACE FUNCTION public.list_relations_v2()
RETURNS TABLE(id uuid, other_id uuid, name text, contact text, email text, phone text, status text, incoming boolean, created_at timestamptz,
  hourly_rate numeric, km_rate numeric, min_hours numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT r.id, o.oid,
    COALESCE(NULLIF(ep.company_name,''), NULLIF(p.company_name,''), p.full_name, p.anonymous_id, 'Onbekend'),
    CASE WHEN r.status='accepted' THEN COALESCE(NULLIF(ep.billing_contact_name,''), NULLIF(p.billing_contact_name,''), p.full_name) END,
    CASE WHEN r.status='accepted' THEN u.email::text END,
    CASE WHEN r.status='accepted' THEN p.phone END,
    r.status, r.addressee_id = auth.uid(), r.created_at,
    rr.hourly_rate, rr.km_rate, rr.min_hours
  FROM relations r
  CROSS JOIN LATERAL (SELECT CASE WHEN r.requester_id = auth.uid() THEN r.addressee_id ELSE r.requester_id END AS oid) o
  LEFT JOIN profiles p ON p.id = o.oid
  LEFT JOIN escort_profiles ep ON ep.id = o.oid
  LEFT JOIN auth.users u ON u.id = o.oid
  LEFT JOIN relation_rates rr ON rr.relation_id = r.id
  WHERE auth.uid() IN (r.requester_id, r.addressee_id) AND r.status <> 'declined';
$$;
REVOKE ALL ON FUNCTION public.list_relations_v2() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_relations_v2() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_relation_rates(_relation_id uuid, _hourly numeric, _km numeric, _min_hours numeric, _waiting numeric, _night_pct numeric, _weekend_pct numeric, _holiday_pct numeric)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM relations WHERE id=_relation_id AND status IN ('accepted','pending') AND auth.uid() IN (requester_id, addressee_id)) THEN
    RAISE EXCEPTION 'Alleen deelnemers van deze relatie kunnen tarieven instellen';
  END IF;
  IF LEAST(_hourly,_km,_min_hours,_waiting,_night_pct,_weekend_pct,_holiday_pct) < 0
     OR GREATEST(_hourly,_waiting) > 1000 OR _km > 50 OR _min_hours > 24 OR GREATEST(_night_pct,_weekend_pct,_holiday_pct) > 300 THEN
    RAISE EXCEPTION 'Ongeldige tariefwaarden';
  END IF;
  INSERT INTO relation_rates (relation_id, hourly_rate, km_rate, min_hours, waiting_rate, night_pct, weekend_pct, holiday_pct, updated_at, updated_by)
  VALUES (_relation_id, _hourly, _km, _min_hours, _waiting, _night_pct, _weekend_pct, _holiday_pct, now(), auth.uid())
  ON CONFLICT (relation_id) DO UPDATE SET hourly_rate=EXCLUDED.hourly_rate, km_rate=EXCLUDED.km_rate, min_hours=EXCLUDED.min_hours,
    waiting_rate=EXCLUDED.waiting_rate, night_pct=EXCLUDED.night_pct, weekend_pct=EXCLUDED.weekend_pct, holiday_pct=EXCLUDED.holiday_pct,
    updated_at=now(), updated_by=auth.uid();
END $function$;