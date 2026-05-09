## Google Agenda koppeling voor begeleiders (twee-richting)

### Wat we bouwen

**1. Database**
- Nieuwe tabel `google_calendar_tokens` (escort_id, access_token, refresh_token, expiry, calendar_id, scope, connected_at) met RLS — alleen eigen rij leesbaar/schrijfbaar.
- Kolom `google_event_id` op `ride_assignments` om gepushte events bij te houden (voor update/verwijder).

**2. Secrets**
Je voegt twee secrets toe in Lovable Cloud:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

In Google Cloud Console moet je de **Authorized redirect URI** instellen op de callback van onze edge function (krijg je na deploy).

**3. Edge functions**
- `google-oauth-start` — genereert OAuth URL met scopes `calendar.events` + `calendar.readonly`, met state = user id.
- `google-oauth-callback` — wisselt code in voor tokens, slaat op in `google_calendar_tokens`, redirect terug naar `/escort-instellingen`.
- `google-calendar-sync` — voor de ingelogde begeleider:
  - **Push**: voor elke geaccepteerde rit (komende 30 dagen) maakt of update een event in Google Agenda; verwijdert events van geannuleerde ritten.
  - **Pull**: leest busy-windows van Google (FreeBusy API) voor de komende 7 dagen.
- `google-calendar-disconnect` — revoke + verwijder tokens.

**4. UI wijzigingen**
- **EscortSettings**: nieuw blok "Google Agenda" met status (verbonden/niet), "Verbinden"-knop, "Nu synchroniseren"-knop, "Loskoppelen"-knop, en laatst-gesynchroniseerd timestamp.
- **AgendaPlanner**: extra read-only laag — half-uur slots die overlappen met Google busy worden lichtgrijs gestreept getoond met tooltip "Bezet volgens Google Agenda" (niet aanpasbaar, niet opgeslagen in DB). Busy-windows worden bij mount opgehaald via de sync-functie.
- Automatisch pushen: na rit-acceptatie roepen we sync aan (best-effort, faalt stil als niet gekoppeld).

### Technische details

- OAuth flow: `access_type=offline&prompt=consent` zodat we altijd een refresh_token krijgen.
- Tokens worden ververst in de sync-functie wanneer expiry < 60s.
- Events bevatten: titel "Begeleiding {pickup} → {dropoff}", locatie pickup, beschrijving met rit-id en cargo, start = `scheduled_at`, duur = `estimated_hours` of 3u default.
- Idempotent: gebruikt `google_event_id` om bestaand event te updaten i.p.v. dubbel aanmaken.
- FreeBusy query op `primary` agenda — geen events worden gelezen, alleen busy-blokken (privacy-vriendelijk).

### Wat jij moet doen

1. OAuth Client ID + Secret van Google klaarhebben.
2. Na deploy: redirect URI in Google Console toevoegen (URL toon ik na deploy).
3. Secrets invullen wanneer ik er om vraag.