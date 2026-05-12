
CREATE OR REPLACE FUNCTION public.escort_ids_excluding_client(_client_id uuid)
RETURNS TABLE (escort_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ep.id
    FROM public.escort_profiles ep
   WHERE (
     ep.client_filter_mode = 'only'
     AND NOT EXISTS (
       SELECT 1 FROM public.escort_preferred_clients epc
        WHERE epc.escort_id = ep.id AND epc.client_id = _client_id
     )
   )
   OR (
     ep.client_filter_mode = 'except'
     AND EXISTS (
       SELECT 1 FROM public.escort_preferred_clients epc
        WHERE epc.escort_id = ep.id AND epc.client_id = _client_id
     )
   );
$$;
REVOKE ALL ON FUNCTION public.escort_ids_excluding_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escort_ids_excluding_client(uuid) TO authenticated, service_role;
