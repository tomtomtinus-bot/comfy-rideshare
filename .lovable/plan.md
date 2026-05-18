# Plan: Bedrijfsaccounts (Planner + Chauffeurs)

## Doel
Een hoofdaccount ("Bedrijfsplanner") kan extra chauffeurs uitnodigen via e-mail. De planner regelt financiën, abonnement, ritacceptatie en toewijzing. Chauffeurs hebben een eigen login, zien alleen hun toegewezen ritten, vullen uren in (planner keurt goed), en zien geen tarieven/facturen.

---

## 1. Datamodel (nieuwe tabellen)

**`companies`**
- `id`, `owner_id` (= planner = begeleider-account), `name`, `seat_limit`, `created_at`

**`company_members`**
- `id`, `company_id`, `user_id`, `role` (`planner` | `driver`), `status` (`active` | `removed`), `joined_at`
- Unique (company_id, user_id). Eén user kan slechts bij één bedrijf horen.

**`company_invitations`**
- `id`, `company_id`, `email`, `token` (uniek), `role` (`driver`), `invited_by`, `expires_at`, `accepted_at`, `status` (`pending`|`accepted`|`expired`|`revoked`)

**Uitbreiding `ride_assignments`**
- `assigned_driver_id uuid null` → de chauffeur die de rit fysiek uitvoert. `escort_id` blijft de planner (= account dat de rit accepteerde / wordt gefactureerd).
- `hours_approved_at`, `hours_approved_by` voor goedkeuringsflow.

**RLS-principes**
- Planner ziet alle company-data + alle assignments van zijn bedrijf.
- Driver ziet: eigen `company_members`-rij, eigen profiel, **enkel** assignments waar `assigned_driver_id = auth.uid()`, met beperkte kolommen (geen tarieven, geen `estimated_cost`, `actual_cost`, `extra_costs_total`, `cancellation_fee`, `invoice_id`).
- Driver mag uren indienen op eigen toegewezen assignment (status → `hours_submitted` blijft, maar pas finaal na planner-goedkeuring).
- Voor kolom-niveau beperkingen: dedicated view `driver_ride_assignments_view` + RLS die `assigned_driver_id = auth.uid()`. Frontend chauffeur leest enkel die view.

Security definer functies: `is_company_planner(uid)`, `is_company_driver(uid)`, `same_company(uid1, uid2)`.

---

## 2. Uitnodigingsflow

1. Planner opent **"Mijn team"** (nieuwe pagina `/team`) — alleen zichtbaar voor begeleiders met actief abonnement.
2. Voert e-mailadres in → edge function `invite-company-driver`:
   - Maakt rij in `company_invitations` met token + 7 dagen geldig.
   - Verstuurt transactionele mail (Lovable Email) met link `/uitnodiging?token=...`.
3. Ontvanger landt op `/uitnodiging`:
   - Niet ingelogd → moet account aanmaken / inloggen (e-mail uit invitatie pre-filled, vergrendeld).
   - Ingelogd met andere e-mail → fout.
4. Edge function `accept-company-invitation`: maakt `company_members` rij (`role=driver`), kent `begeleider` rol toe, koppelt aan bedrijf, markeert invitatie `accepted`.
5. Driver krijgt verkort onboarding (geen tarieven, geen IBAN, geen Stripe — enkel persoonsgegevens, certificaat, voertuig).

**Seat enforcement:** vóór invite + accept controleert function `active_member_count < seat_limit` (komt uit Stripe-abonnement subscription quantity).

---

## 3. Abonnement (per seat)

- Bestaand `subscriptions` product wordt aangepast naar **per-seat pricing** (Stripe `quantity`).
- `seat_limit` op `companies` = huidige `subscription.quantity`.
- Planner kan in `/abonnement` chauffeur-seats toevoegen/verlagen → update via Stripe portal of via "Aantal chauffeurs aanpassen" knop → edge function past `subscription_item.quantity` aan.
- Webhook (`payments-webhook`) synchroniseert `seat_limit` bij elke wijziging.
- Driver-accounts hebben zelf geen abonnement; `RequireSubscription` checkt bedrijf-abonnement van planner.

---

## 4. UI-wijzigingen

**Planner**
- Nieuwe pagina `/team` (`Team.tsx`):
  - Lijst chauffeurs (naam, e-mail, status, koppel-/verwijder-knop).
  - Lijst openstaande uitnodigingen + "Nieuwe chauffeur uitnodigen" dialog.
  - Knop "Seats beheren" → naar `/abonnement`.
- Op `EscortRideDetail.tsx` (accepteerde rit):
  - Nieuwe sectie **"Toewijzen aan chauffeur"** met dropdown van eigen chauffeurs + zichzelf. Default = zichzelf.
  - Wijzigbaar tot start van rit; daarna niet meer.
- Op `Dashboard.tsx` (planner): nieuw kaartje "Mijn team" met aantal chauffeurs / seats.
- **Urenoverzicht**: bestaande urenflow krijgt extra status. Wanneer driver uren indient → planner ziet "Uren ter goedkeuring" badge → goedkeuren/aanpassen → pas dan komt het op factuur.

**Chauffeur**
- Aparte minimal dashboard `/chauffeur` (of hergebruik `Dashboard.tsx` met `driverMode` flag):
  - Vandaag/komende ritten (alleen toegewezen).
  - Geen tarieven/facturen/abonnement/team in navigatie.
  - GPS live-locatie + geplande standplaatsen (eigen, persoonlijk).
  - Rit-detail toont route, opdrachtgever, voertuiginfo — **geen** prijzen/uurtarief.
  - Uren-invoer scherm.
- `Nav.tsx`: verbergt "Facturen", "Facturatiegegevens", "Abonnement", "Team", "Brandstofprijzen" voor drivers.
- `RoleSwitch`/`useAuth`: nieuwe afgeleide flag `companyRole` (`planner` | `driver` | `solo`).

**Matching / RequestRide (opdrachtgever-zijde)**
- Een bedrijf telt als één entiteit. Opdrachtgever ziet planner-profiel (anonymous_id van planner) met label "Bedrijf · X chauffeurs". Tijdelijke standplaats / geplande standplaats worden geaggregeerd uit alle chauffeurs van het bedrijf (dichtsbijzijnde wint).

---

## 5. Notificaties / e-mails

- Nieuwe transactionele mail: **`company-invitation`** (token-link).
- Push/in-app notificatie naar driver bij toewijzing.
- Push naar planner bij ingediende uren.

---

## 6. Edge functions (nieuw / aangepast)

- `invite-company-driver` (nieuw) — valideert seat-limiet, maakt invitatie, queuet e-mail.
- `accept-company-invitation` (nieuw) — token check, member creatie.
- `assign-driver` (nieuw) — planner wijst chauffeur aan assignment; check zelfde bedrijf.
- `approve-driver-hours` (nieuw) — planner accordeert ingediende uren → triggert bestaande facturatieflow.
- `payments-webhook` (uitbreiden) — sync seat_limit bij quantity-wijziging.

---

## 7. Migratie bestaande accounts

Bestaande begeleider-accounts blijven werken als "solo planner" zonder chauffeurs (impliciet bedrijf met `seat_limit = 1`). Bij eerste invite wordt automatisch `companies`-rij aangemaakt indien nog niet aanwezig.

---

## 8. Juridisch (Privacy + AV update later)

Korte addendum nodig: bedrijfsstructuur, gegevensdeling planner↔chauffeur, verantwoordelijkheid planner voor toewijzing. (apart op te voeren na implementatie).

---

## Implementatie-volgorde (voorgesteld)

1. Migratie: tabellen + RLS + helper-functies.
2. Backend: invite + accept + assign edge functions, e-mailtemplate.
3. Planner UI: `/team` pagina, toewijzen-dropdown op ride detail.
4. Chauffeur UI: aangepaste navigatie, dashboard-filter, ride-detail zonder financiën.
5. Urengoedkeuringsflow.
6. Seat-based pricing (Stripe quantity) — kan eventueel later als losse stap.

Akkoord met dit plan? Of wil je aanpassingen (bv. seat-pricing later, andere naam, extra rechten voor chauffeur)?
