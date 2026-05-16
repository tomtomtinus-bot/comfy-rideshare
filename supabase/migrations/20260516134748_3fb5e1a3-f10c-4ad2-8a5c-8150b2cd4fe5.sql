UPDATE public.notifications n
SET ride_id = r.id
FROM public.rides r
WHERE n.ride_id IS NULL
  AND n.ride_assignment_id IS NULL
  AND n.type IN ('broadcast_closed','invitations_expired')
  AND r.client_id = n.user_id
  AND n.body LIKE '%' || r.pickup_city || ' → ' || r.dropoff_city || '%'
  AND r.created_at <= n.created_at
  AND r.id = (
    SELECT r2.id FROM public.rides r2
    WHERE r2.client_id = n.user_id
      AND n.body LIKE '%' || r2.pickup_city || ' → ' || r2.dropoff_city || '%'
      AND r2.created_at <= n.created_at
    ORDER BY r2.created_at DESC
    LIMIT 1
  );