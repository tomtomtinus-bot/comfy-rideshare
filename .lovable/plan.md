## Fase B — Broadcast venster + bundeling

### 1) 5-minuten broadcast venster (beste match wint)

**Wat verandert er voor de begeleider**
- Knop "✓ Accepteren" wordt **"Ik ben beschikbaar"** (in app + e-mail magic link).
- Tekst onder de knop: "Je bent beschikbaar gemeld. Binnen 5 minuten wordt de beste match gekozen op basis van afstand, rating en eerdere samenwerkingen. Je krijgt direct bericht."
- Zodra het venster sluit krijgt elke deelnemer push + e-mail: gewonnen of net niet.

**Wat verandert er voor de opdrachtgever**
- Op het dashboard zie je nu: **"3 begeleiders beschikbaar gemeld — selectie over 02:14"** met progressie-balk.
- Na het venster: badge "X / Y bevestigd" zoals nu.

**Database (migratie)**
- `ride_assignments.interest_expressed_at timestamptz null`
- `ride_assignments.interest_score numeric null` (hoger = beter)
- `ride_assignments.broadcast_closes_at timestamptz null` — gezet wanneer eerste interesse binnenkomt = `now() + 5 min` (gemaximeerd op `responds_by`)
- `responds_by` default verlaagd naar **10 min** (blijft hetzelfde) zodat we binnen de venstertijd ruimte houden

**Selectie-score (server-side)**
```
score = 100
      − afstand_km_van_basis_tot_pickup × 1.5
      + rating × 10
      + min(eerdere_samenwerkingen_met_klant, 5) × 4
```
Hoogste N (N = `rides.num_escorts`) wint.

**Edge functions**
- Nieuwe: `express-ride-interest` (begeleider, of via signed magic link in e-mail) — zet `interest_expressed_at`, berekent `interest_score`, zet `broadcast_closes_at` als nog niet gezet.
- Nieuwe: `close-ride-broadcasts` — cron (elke minuut): voor elke rit waar `broadcast_closes_at < now()` én er is minimaal 1 interesse:
  - top-N krijgt `status='accepted'`, rest krijgt `status='declined'`
  - notificaties + e-mail: "Je bent gekozen" / "Net niet gekozen"
  - cliënt-notificatie: "X begeleiders bevestigd"
- Aanpassen: `accept-ride-invitation` (huidige one-click) → wordt `express-ride-interest` (zelfde route, ander gedrag + tekst).
- Aanpassen: `auto-release-invitations` blijft, maar slaat nu uitnodigingen over die `interest_expressed_at` hebben.

**Front-end**
- `EscortRideDetail.tsx`: knop label/handler aanpassen, nieuwe statusweergave ("beschikbaar gemeld — wacht op selectie / gekozen / niet gekozen").
- `Dashboard.tsx` (cliënt): nieuwe badge tijdens broadcast venster.
- E-mail template `ride-invitation.tsx`: tekst & button label.

---

### 2) Bundeling door opdrachtgever (handmatig)

**UX**
- Op het dashboard krijgt elke open rit een checkbox. Onderin verschijnt "Bundel geselecteerde ritten (2 of meer)". Klik → modal "Pakket-uitnodiging: begeleiders mogen alle ritten in één klik accepteren of weigeren".
- Voor begeleiders: in de uitnodigings-e-mail en EscortRideDetail krijgt de rit een banner "📦 Pakket: 3 ritten" met overzicht. Eén knop "Accepteer alle 3" of "Alleen deze rit".

**Database**
- `rides.bundle_id uuid null` — gedeeld voor ritten in hetzelfde pakket
- `rides.bundle_label text null` (bv. "ZW-corridor di+wo")

**Logica**
- Bij beschikbaar-melden op een bundle-rit: client kan kiezen "alleen deze" of "alle in pakket" — bij "alle" worden parallel `interest_expressed_at` voor de andere bundle-ritten gezet (mits begeleider uitgenodigd is voor die ritten — als niet, dan auto-uitnodigen).
- Selectie-cron behandelt elke rit zelfstandig (geen "all-or-nothing" garantie — risico te groot).

**Front-end**
- `Dashboard.tsx` (cliënt): selectie-checkboxes + bulk-actie knop + modal.
- `EscortRideDetail.tsx`: pakket-banner + "alle accepteren" knop wanneer `bundle_id` is gevuld.
- Nieuwe edge function `bundle-rides` (cliënt-side actie).

---

### Volgorde van uitvoeren
1. Migratie: nieuwe kolommen.
2. Edge functions vervangen/toevoegen + cron `close-ride-broadcasts` aansluiten.
3. Begeleider-UX aanpassen (knop, statussen).
4. Cliënt-UX (broadcast badge + bundel-selectie).
5. E-mail templates bijwerken.

### Wat ik aan jou vraag voor we beginnen
1. Akkoord met de scoreformule (afstand × 1.5 / rating × 10 / herhaal-klant × 4)? Of een andere weging?
2. Akkoord dat bundel-acceptatie geen "alles-of-niets" is (te veel risico op deadlock)?
3. Mag het venster ook **vroegtijdig** sluiten als alle uitgenodigde begeleiders interesse hebben getoond, ook al zijn de 5 min nog niet om?
