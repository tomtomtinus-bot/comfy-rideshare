## Doel
Platform-facturen 2× per maand i.p.v. wekelijks, en abonnementskosten (opdrachtgever €50/maand) op die facturen meenemen i.p.v. via Stripe-abo.

## Schema-wijzigingen (1 migration)
- `platform_invoices`: nieuwe kolommen
  - `subscription_amount numeric NOT NULL DEFAULT 0` — €25 (50% van €50) per factuur
  - `rides_amount numeric NOT NULL DEFAULT 0` — fee-deel (huidige `total_amount` logica)
  - `total_amount` blijft = rides_amount + subscription_amount
- `profiles`: `monthly_subscription_fee numeric NOT NULL DEFAULT 50` — zodat we het later per klant kunnen aanpassen
- `last_platform_invoice_at` blijft als cursor (nu op factuur-`created_at`-basis i.p.v. ride-datum)

## `generate_platform_invoices()` herschrijven
- Bepaal huidige periode op basis van vandaag:
  - Dag 15 → periode = `[1e 00:00, 15e 23:59:59]` van huidige maand
  - Laatste dag (28/30/31) → periode = `[16e 00:00, laatste dag 23:59:59]` van huidige maand
- Ritten geselecteerd via `invoices.created_at` (escort-factuur) binnen periode i.p.v. `r.scheduled_at`. Hierdoor valt een escort-factuur die op de 31e is gemaakt automatisch in de eerstvolgende 1–15 periode.
- App-fee = 1,5% van `invoice_items.amount` (ongewijzigd) → `rides_amount`
- `subscription_amount` = ROUND(monthly_subscription_fee × 0.5, 2)
- Bug fix uit vorig gesprek: cursor alleen bumpen als er ook daadwerkelijk een factuur is aangemaakt
- Extra factuurregel voor abonnement: rij in `platform_invoice_items` met `ride_id = NULL`, `route = 'Abonnement (½ maand)'`. Vereist dat `ride_id` nullable wordt (migration).

## Cron-schema
- Bestaande wekelijkse cron uitschakelen
- Twee nieuwe schedules:
  - `0 6 15 * *` → 15e om 06:00
  - `0 6 28 2 *` (alleen feb) + `0 6 L * *` is niet ondersteund door pg_cron; gebruik in plaats daarvan dagelijks `0 6 * * *` met een check in de functie: alleen draaien als vandaag = 15 OF = laatste dag van de maand.
- Eenvoudiger: 1 dagelijkse cron `0 6 * * *` → functie bepaalt zelf of vandaag een factuurdag is.

## Catch-up
Direct na deploy: handmatig `generate_platform_invoices()` aanroepen met override-periode `[2026-05-19, 2026-05-31]` voor de 2 betroffen klanten zodat de 3 openstaande ritten alsnog gefactureerd worden.

## Stripe-abo opdrachtgevers stopzetten
- Edge-functie `cancel-client-subscription` (eenmalige run) die voor elke profiel met rol 'opdrachtgever' het lopende Stripe-abo cancelt (immediate, geen refund — abo eindigt einde lopende periode).
- Nieuwe checkout-flow voor opdrachtgevers wordt **niet** meer via Stripe-abo gestart; pricing-pagina/checkout aanpassen valt buiten deze stap (alleen back-end fix nu). UI-vermelding kan later.

## Te wijzigen bestanden
- `supabase/migrations/*` — schema + functie-herdefinitie
- `supabase/functions/cancel-client-subscription/index.ts` — nieuw (eenmalig)
- `supabase/functions/charge-platform-invoice/index.ts` — ongewijzigd
- Cron: via `supabase--insert` SQL (job_id van oude weeklycron uitschakelen, nieuwe dagelijkse cron toevoegen)

## Open vraag
Klopt het dat alle huidige opdrachtgevers nog geen actief Stripe-abo hebben (alleen 1 begeleider-abo gevonden)? Zo ja, dan kunnen we de cancel-stap overslaan.
