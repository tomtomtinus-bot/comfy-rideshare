-- Bedrijfschauffeurs mogen wél als escort uitgenodigd worden; de planner accepteert.
-- We verwijderen de eerdere harde blokkades en herstellen de publieke view.

drop policy if exists "Block company drivers from acting as escort" on public.ride_assignments;
drop policy if exists "Block inserts assigning company drivers as escort" on public.ride_assignments;

create or replace view public.escort_profiles_public as
select id, anonymous_id, base_city, base_lat, base_lng, current_lat, current_lng,
    current_address, current_until, hourly_rate, hourly_rate_be, hourly_rate_de,
    hourly_rate_fr, hourly_rate_lu, km_rate_de, min_billable_hours, rating,
    rides_completed, countries, categories, cert_verified_countries, languages,
    vehicle_type, vehicle_has_konvooi_sign, vehicle_has_lightbar, vehicle_has_height_pole,
    escort_types, available, company_name, billing_country, wero_enabled, wero_handle,
    wero_fee, fuel_surcharge, surcharges, cert_expires_on, client_filter_mode,
    created_at, updated_at
from public.escort_profiles;

alter view public.escort_profiles_public set (security_invoker = true);

-- Planner mag ride_assignments van zijn drivers zien en accepteren/wijzigen
create or replace function public.get_user_company_id_as_owner(_uid uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.companies where owner_id = _uid limit 1;
$$;

drop policy if exists "Planner sees driver assignments" on public.ride_assignments;
create policy "Planner sees driver assignments"
on public.ride_assignments for select to authenticated
using (
  exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = ride_assignments.escort_id
      and cm.role = 'driver' and cm.status = 'active'
      and c.owner_id = auth.uid()
  )
);

drop policy if exists "Planner updates driver assignments" on public.ride_assignments;
create policy "Planner updates driver assignments"
on public.ride_assignments for update to authenticated
using (
  exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = ride_assignments.escort_id
      and cm.role = 'driver' and cm.status = 'active'
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.company_members cm
    join public.companies c on c.id = cm.company_id
    where cm.user_id = ride_assignments.escort_id
      and cm.role = 'driver' and cm.status = 'active'
      and c.owner_id = auth.uid()
  )
);