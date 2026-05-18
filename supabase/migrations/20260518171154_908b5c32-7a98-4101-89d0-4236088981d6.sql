-- 1) Helper: actief lid van een bedrijf met rol 'driver'?
create or replace function public.is_company_driver(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members
    where user_id = _uid
      and role = 'driver'
      and status = 'active'
  );
$$;

-- 2) Begeleiderlijst (opdrachtgever-zoekt-begeleider) sluit bedrijfschauffeurs uit
create or replace view public.escort_profiles_public as
select id,
    anonymous_id,
    base_city,
    base_lat,
    base_lng,
    current_lat,
    current_lng,
    current_address,
    current_until,
    hourly_rate,
    hourly_rate_be,
    hourly_rate_de,
    hourly_rate_fr,
    hourly_rate_lu,
    km_rate_de,
    min_billable_hours,
    rating,
    rides_completed,
    countries,
    categories,
    cert_verified_countries,
    languages,
    vehicle_type,
    vehicle_has_konvooi_sign,
    vehicle_has_lightbar,
    vehicle_has_height_pole,
    escort_types,
    available,
    company_name,
    billing_country,
    wero_enabled,
    wero_handle,
    wero_fee,
    fuel_surcharge,
    surcharges,
    cert_expires_on,
    client_filter_mode,
    created_at,
    updated_at
from public.escort_profiles
where not public.is_company_driver(id);

-- 3) Restrictive RLS: bedrijfschauffeurs mogen geen ride_assignments wijzigen
--    waar zij escort_id zijn (dat is de "ik accepteer/weiger als begeleider"-flow).
--    Hun toegestane pad (urenflow via assigned_driver_id) blijft onaangetast.
drop policy if exists "Block company drivers from acting as escort" on public.ride_assignments;
create policy "Block company drivers from acting as escort"
on public.ride_assignments
as restrictive
for update
to authenticated
using (not (public.is_company_driver(auth.uid()) and escort_id = auth.uid()))
with check (not (public.is_company_driver(auth.uid()) and escort_id = auth.uid()));

-- 4) Idem voor INSERT: voorkomen dat iemand een driver alsnog als escort_id zet
--    (clients doen dit via RequestRide; daar filteren we hen al uit, dit is een vangnet).
drop policy if exists "Block inserts assigning company drivers as escort" on public.ride_assignments;
create policy "Block inserts assigning company drivers as escort"
on public.ride_assignments
as restrictive
for insert
to authenticated
with check (not public.is_company_driver(escort_id));