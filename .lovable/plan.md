# E-mailmeldingen uitbreiden

## Huidige situatie

Er zijn al 4 e-mailtemplates actief: `ride-confirmation` (opdrachtgever na plaatsing), `ride-invitation` (begeleider — nieuwe rit beschikbaar), `discount-ending`, `new-signup-admin`. De infrastructuur (queue, domein, send-transactional-email) draait al.

## Wat er nieuw bijkomt

### Opdrachtgever
1. **Match gevonden** — wanneer een begeleider de rit accepteert. Trigger in `accept-ride-invitation` edge function.
2. **Betalingsbevestiging / factuur klaar** — zodra Stripe de platformfactuur betaald markeert. Trigger in `payments-webhook` (invoice.payment_succeeded) of in `generate-invoice-pdf`.
3. **Annulering door begeleider** — wanneer een toegewezen begeleider zich afmeldt (swap-flow of directe cancel). Trigger waar de assignment wordt verwijderd/geannuleerd.

### Begeleider
4. **Definitieve bevestiging** — direct na accept (en na eventuele betaling). Trigger in `accept-ride-invitation`.
5. **Wijziging ritdetails** — wanneer opdrachtgever de rit aanpast. Trigger in de bestaande RPC/notify-flow van `EditRide` (notify_ride_updated → edge function `notify-ride-updated` of inline).
6. **Factuur klaar — controleer** — als begeleidersfactuur is gegenereerd. Trigger in `generate-invoice-pdf` (escort variant).

### Admin
7. **Stripe-betalingsfout** — webhook-events `invoice.payment_failed`, `charge.failed`, of signature-verificatiefouten. Trigger in `payments-webhook`.

(Reeds afgedekt: nieuwe bedrijfsaanmelding via `new-signup-admin`, nieuwe beschikbare rit via `ride-invitation`, ritplaatsingsbevestiging via `ride-confirmation`.)

## Aanpak

Per e-mail:
- Nieuw `.tsx` template in `supabase/functions/_shared/transactional-email-templates/` met dezelfde brass/parchment-styling als bestaande templates.
- Toevoegen aan `registry.ts`.
- `supabase.functions.invoke('send-transactional-email', …)` aanroep met `idempotencyKey` op de juiste plek (edge function of client).
- Voor admin-mails: ophalen van admin e-mailadressen via een query op `user_roles` + `profiles` (zoals `new-signup-admin` doet).

Aan het eind één keer `deploy_edge_functions` voor alle gewijzigde functies.

## Technische details

- Idempotency keys:
  - match-found: `match-${rideId}-${escortUserId}`
  - definitive-confirm: `confirm-${rideId}-${escortUserId}`
  - payment-confirm: `payment-${invoiceId}`
  - ride-cancelled-by-escort: `cancel-${rideId}-${escortUserId}`
  - ride-updated: `update-${rideId}-${updatedAt}`
  - escort-invoice-ready: `escort-invoice-${invoiceId}`
  - payment-failed-admin: `payment-failed-${stripeEventId}`
- Geen DB-schema wijzigingen nodig.
- Geen nieuwe edge functions; alles via bestaande `send-transactional-email`.

## Open vraag

Voor de **wijziging ritdetails**-mail: alleen sturen bij wijziging van starttijd/locatie/datum, of bij elke aanpassing (ook ontheffing/chauffeurs)? Standaard: bij elke wijziging één e-mail, met "controleer de bijgewerkte ritdetails in de app".
