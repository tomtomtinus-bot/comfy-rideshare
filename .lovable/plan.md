# Aansluitende ritten in ritaanvraag

Onder het bestaande Route-blok komt een nieuwe sectie **"Aansluitende ritten"** waar een opdrachtgever extra deelritten (leg 2, 3, 4 …) kan toevoegen. De begeleider neemt het hele pakket aan, krijgt één tarief en één factuurregel. Begeleidingstijd loopt vanaf start rit 1 tot einde laatste rit (inclusief wachttijd), plus aanrij- en terugreistijd.

## Schema

```text
rides
└── extra_legs  jsonb  (default '[]')
       [
         { pickup_address, pickup_city, pickup_lat, pickup_lng,
           dropoff_address, dropoff_city, dropoff_lat, dropoff_lng,
           scheduled_at  (ISO timestamp) }
         …
       ]
```

Eén rit-record blijft het anker. Lading, vergunning, kentekens, chauffeurs en de geboekte begeleider gelden voor het hele pakket. Geen wijziging aan `ride_assignments`.

## UI – RequestRide

Nieuwe sectie direct onder Route, boven Lading & vergunning:

- Knop **"+ Aansluitende rit toevoegen"**.
- Per extra leg een kaart met:
  - Vertrek-adres (AddressAutocomplete)
  - Bestemming-adres (AddressAutocomplete)
  - Datum + kwartiertijd (zelfde stijl als hoofdblok)
  - Verwijderknop
- Tijdvolgorde-validatie: elke leg-start moet ≥ einde vorige leg liggen (geschatte rijduur via `travelMinutes(distanceKm)`).
- Onder de lijst een samenvattingsblok: totale begeleidingstijd = `lastLegEnd − leg1Start`, plus `+ aanrijden + terugreis` per begeleider.

## Matching & boeking

- Aanrijden = vanaf basis begeleider naar pickup van **leg 1**.
- Terugreis = vanaf dropoff van **laatste leg** terug naar basis.
- Begeleidingstijd binnen pakket = `lastLegEnd − leg1Start` (incl. wachten).
- Schatting per leg via bestaande `travelMinutes(distanceKm)`; eind = `legStart + duur`.
- Conflict-check (`get_escort_busy_windows`) gebruikt venster `leg1Start … lastLegEnd`.
- Bij boeken: `rides.scheduled_at = leg1.start`, `rides.time_window_end = lastLegEnd`, en `extra_legs` gevuld.
- `ride_assignments.estimated_hours/estimated_cost` op basis van totale tijd.

## Weergave op detailpagina's

Op `ClientRideDetail` en `EscortRideDetail` een chronologisch lijstje "Route":
1. Pickup → Dropoff – starttijd
2. Pickup → Dropoff – starttijd
   …

Bestaande pickup/dropoff-velden tonen de eerste leg; extra legs eronder.

## Wijzigingen

- Migratie: `ALTER TABLE rides ADD COLUMN extra_legs jsonb NOT NULL DEFAULT '[]'`.
- `src/pages/RequestRide.tsx`: nieuwe state `extraLegs`, UI-sectie, validatie, aangepaste `findMatches` (start/eind, ride-duur), aangepaste `bookEscorts` (insert).
- `src/pages/ClientRideDetail.tsx` + `src/pages/EscortRideDetail.tsx`: leg-lijst tonen wanneer `extra_legs.length > 0`.

## Buiten scope (later)

- Bewerken van extra legs na boeking (`EditRide.tsx`).
- Aparte facturatie per leg.
- Per-leg lading of vergunning.
- Bundle-flow / 1-op-1 voorrang voor losse vervolgritten (blijft beschikbaar voor wie meerdere losse rides wil maken).
