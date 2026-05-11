# Pakket-ritten — herontwerp

De huidige "selecteer ritten op dashboard"-bundel-UI wordt verwijderd. In plaats daarvan wordt een pakket gestart bij de ritaanvraag en kan oneindig groeien — ook nadat ritten al geaccepteerd zijn.

## Gedrag

### 1) Pakket starten bij ritaanvraag (`/aanvragen`)
- Onderaan het ritformulier komt een nieuw blok: **"Maak hier een pakket van — voeg extra ritten toe"**.
- Toggle aan → er verschijnt een veld **Pakketnaam** (verplicht, bv. "ZW-corridor di+wo") en knop **"+ Extra rit toevoegen"**.
- Elke extra rit = volledig formulier (pickup, dropoff, tijd, lading, voertuig, etc.) — exact dezelfde velden als de hoofdrit.
- Onbeperkt aantal extra ritten in één aanvraag.
- Bij verzenden: alle ritten krijgen hetzelfde `bundle_id` + `bundle_label`, en de invitations gaan parallel uit (huidige flow per rit).
- Vinkje **"Er kunnen later nog ritten bijkomen"** → zet `bundle_open_for_extension = true`. Begeleiders zien dan een badge **"📦 Mogelijk vervolgritten"** in de uitnodiging.

### 2) Extra rit toevoegen aan een lopend pakket
- Op het bestaande pakket (zichtbaar in dashboard) komt een knop **"+ Extra rit toevoegen aan dit pakket"**.
- Opent volledig ritformulier; bij verzenden wordt de rit aan dezelfde `bundle_id` gehangen.
- **Aanbiedingslogica**: in plaats van breed broadcast krijgt elke begeleider die al een geaccepteerde rit in dit pakket heeft een **exclusief 1-op-1 aanbod (30 min)**.
  - Status `invited`, met vlag `bundle_priority_offer = true` en `responds_by = now() + 30min`.
  - Als de begeleider accepteert → standaard accept-flow; rit gaat uit broadcast (geen anderen krijgen het meer aangeboden).
  - Als de begeleider weigert of de 30 min verloopt → rit gaat alsnog naar de normale broadcast (5-min venster, beste match wint).
- **Belangrijk**: weigering of timeout heeft **geen effect** op zijn andere geaccepteerde ritten in het pakket.
- Als het pakket meerdere begeleiders nodig heeft (`num_escorts > 1`), krijgen ze het allemaal parallel exclusief; eerste accepteer wint, anderen krijgen "deze plek is gevuld" notificatie.

### 3) Begeleider-zicht
- E-mail / app-notificatie krijgt header **"📦 Pakket: {label} — vervolgrit"**.
- In `EscortRideDetail` toont een geel banner: *"U bent uitgenodigd voor een vervolgrit binnen pakket '{label}'. U heeft tot {tijd} om te beslissen — daarna gaat het naar andere begeleiders. Weigeren raakt uw andere ritten niet."*
- Twee knoppen: **"✓ Accepteer vervolgrit"** / **"✗ Niet voor mij"**.
- Bij weigering: optionele reden, dan instant terug naar dashboard met bevestiging.

## Database

```sql
ALTER TABLE rides
  ADD COLUMN bundle_open_for_extension boolean NOT NULL DEFAULT false;

ALTER TABLE ride_assignments
  ADD COLUMN bundle_priority_offer boolean NOT NULL DEFAULT false,
  ADD COLUMN bundle_priority_expires_at timestamptz NULL;
```

Geen breaking change op bestaande `bundle_id` / `bundle_label` — die blijven werken.

## RPC's

- **`add_ride_to_bundle(_template_ride_id uuid, _new_ride jsonb)`** — opdrachtgever-RPC. Maakt nieuwe `rides` rij met dezelfde `bundle_id` als template, status `open`. Identificeert toegewezen begeleider(s) van pakket, maakt `ride_assignments` met `bundle_priority_offer = true`, `responds_by = now() + 30min`, en triggert e-mail.
- **`escort_decline_bundle_offer(_assignment_id uuid)`** — markeert deze ene assignment `declined`. Cron-job (zie hieronder) controleert of alle priority-aanbiedingen voor deze rit declined/verlopen zijn → maakt rit alsnog open voor brede broadcast.
- **`expire_bundle_priority_offers()`** — cron, elke minuut. Voor `bundle_priority_offer = true AND status = 'invited' AND bundle_priority_expires_at < now()`: zet status `declined` en open rit voor breed broadcast (insert nieuwe `invited` assignments via bestaande matching).

## Wat verdwijnt

- Selectie-checkboxes + "Bundel ritten" toggle op `Dashboard.tsx` (huidige bulk-bundel-UI).
- Modal voor pakketnaam in dashboard.
- "Meld beschikbaar voor hele pakket"-knop in `EscortRideDetail` (overbodig — pakketten worden nu 1-rit-per-keer aangeboden aan vaste begeleider).
- RPC `bundle_rides` + `unbundle_ride` worden gemarkeerd als deprecated maar blijven staan (geen data-verlies).

## Bestanden

- **Migratie** (nieuwe kolommen + nieuwe RPC's).
- **`src/pages/RequestRide.tsx`** — pakket-blok onderaan met "+ extra rit"-flow (lokale state-array van extra ritten, één submit-knop maakt alles).
- **`src/pages/Dashboard.tsx`** — verwijder bulk-bundel-UI, voeg "+ Extra rit aan pakket" knop toe per pakket-rit.
- **`src/pages/EscortRideDetail.tsx`** — verwijder "alles accepteren" knop, voeg priority-offer banner + decline-knop toe wanneer `bundle_priority_offer = true`.
- **`supabase/functions/_shared/transactional-email-templates/ride-invitation.tsx`** — variant voor `bundle_priority_offer` (label, knoptekst, 30 min messaging) + badge "mogelijk vervolg" bij `bundle_open_for_extension`.
- **Nieuwe edge function `expire-bundle-priority-offers`** + cron registratie.

## Volgorde
1. Migratie (kolommen + RPC's).
2. `RequestRide.tsx` — pakket-blok bij aanmaak.
3. `Dashboard.tsx` — "+ extra rit"-knop, oude UI weg.
4. `EscortRideDetail.tsx` + e-mail template — priority-offer flow.
5. Cron edge function voor verloop.
