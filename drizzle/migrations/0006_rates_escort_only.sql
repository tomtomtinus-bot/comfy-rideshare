CREATE OR REPLACE FUNCTION public.set_relation_rates(_relation_id uuid, _hourly numeric, _km numeric, _min_hours numeric, _waiting numeric, _night_pct numeric, _weekend_pct numeric, _holiday_pct numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'begeleider') THEN
    RAISE EXCEPTION 'Alleen de begeleider kan tarieven instellen';
  END IF;
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
END $$;