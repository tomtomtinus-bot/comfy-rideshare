## Doel
Opdrachtgever kan een geboekte begeleider verplaatsen naar een andere eigen rit. Begeleider(s) moeten akkoord geven via in-app notificatie.

## Twee scenario's
1. **Vastzetten op open rit** — begeleider verhuist van rit A (waar hij geaccepteerd is) naar rit B (status `open`, nog geen begeleider). Alleen die ene begeleider hoeft akkoord te geven. Plek op rit A komt vrij (terug naar `open`, broadcast kan opnieuw).
2. **1-op-1 ruil** — twee ritten van dezelfde opdrachtgever, beide met geaccepteerde begeleiders. Beide begeleiders moeten akkoord. Pas wanneer beiden goedkeuren wordt de wissel doorgevoerd.

Voorwaarde voor beide: opdrachtgever is `client_id` van beide ritten, beide ritten in de toekomst, geen `cancelled`/`completed` status.

## Backend wijzigingen

### Nieuwe tabel `ride_swap_requests`
```
id uuid pk
client_id uuid                  -- aanvrager (= client van beide ritten)
source_assignment_id uuid       -- de te verplaatsen toewijzing (geaccepteerd)
source_ride_id uuid
target_ride_id uuid             -- doelrit
target_assignment_id uuid null  -- null = open rit; gevuld = 1-op-1 ruil
source_escort_decision text     -- 'pending' | 'accepted' | 'declined'
target_escort_decision text     -- 'pending' | 'accepted' | 'declined' | 'n_a' (open rit)
status text                     -- 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
reason text null                -- toelichting opdrachtgever
expires_at timestamptz          -- bv. 24u
decided_at timestamptz null
created_at timestamptz default now()
```
RLS: client ziet/wijzigt eigen aanvragen; betrokken begeleiders zien hun eigen aanvragen; admins alles.

### RPC's (security definer)
- `client_request_swap(_source_assignment, _target_ride, _reason)` — valideert eigenaarschap, maakt swap-request, zet notificaties + assignment-flag, return id.
- `escort_decide_swap(_swap_id, _approve)` — markeert source/target decision; als beide `accepted` → uitvoeren; als één `declined` → `declined` en cleanup.
- `client_cancel_swap(_swap_id)` — opdrachtgever trekt aanvraag in.

Uitvoering bij `accepted`:
- Open-rit case: source ride wordt `open`, source assignment → `cancelled` (met reden "swapped"), nieuwe assignment op target ride met dezelfde escort, status `accepted`.
- Ruil-case: beide assignments krijgen elkaars `ride_id` (of cancel + nieuwe accepted-assignment per escort).
- Bij beide gevallen: notificaties naar betrokken escorts en client, Google Calendar opnieuw syncen wordt automatisch door triggers/edge gedaan indien aanwezig (anders no-op).

### Notificaties
Insert in `notifications` (type `swap_request` / `swap_resolved`) per betrokken begeleider; bestaande `NotificationsListener` toont ze.

## UI wijzigingen

### `ClientRideDetail.tsx`
Per geaccepteerde begeleider extra knop **"Verplaats naar andere rit"** → opent dialoog:
- Lijst van eigen toekomstige ritten waar deze begeleider níet al op zit, gegroepeerd in:
  - "Open ritten zonder begeleider"
  - "Ritten met andere begeleider (ruil)"
- Optioneel reden-veld, knop **Aanvraag versturen**.
- Toont lopende swap-aanvragen voor deze rit (status + intrekken-knop).

### `EscortRideDetail.tsx`
Banner bovenaan wanneer er een openstaande swap-aanvraag is voor deze rit:
- Toont info (van/naar, datum/route doelrit, evt. tegenpartij anoniem ID, reden).
- Knoppen **Akkoord** / **Weigeren**.
- Bij ruil: vermeldt "wacht op andere begeleider" als eigen besluit accepted is maar tegenpartij nog niet.

### Notifications
Bestaande notificatiebel toont `swap_request` met deeplink naar de betreffende EscortRideDetail.

## Bestanden
- migration: nieuwe tabel + RLS + 3 RPC's
- `src/pages/ClientRideDetail.tsx` — knop + dialoog + lopende aanvragen
- `src/pages/EscortRideDetail.tsx` — banner met accept/decline
- nieuwe component `src/components/site/SwapRequestDialog.tsx`
- nieuwe component `src/components/site/SwapPendingBanner.tsx` (escort-zijde)

Geen edge functions nodig — alles via RPC's en bestaande notificatie-infrastructuur.