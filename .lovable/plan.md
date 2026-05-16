# Pushmeldingen via webpush + installeerbare PWA

## Wat krijg je
- Begeleiders en opdrachtgevers kunnen ViaCust **toevoegen aan beginscherm** (iPhone via Safari "Deel → Zet op beginscherm", Android automatisch via install-knop).
- Daarna krijgen ze **pushmeldingen** op precies dezelfde events die nu al mail sturen:
  - Begeleider: nieuwe ritaanvraag, vervangingsuitnodiging.
  - Opdrachtgever: rit geaccepteerd, rit afgewezen, begeleider on-route, etc.
- In hun profiel komt onder *Notificatie-instellingen* een vinkje **"Pushmeldingen op dit apparaat"** + een knop om te activeren/uit te zetten per apparaat.

## Werking (technisch, beknopt)
- Geen `vite-plugin-pwa` (botst met de Lovable preview). In plaats daarvan:
  - `public/manifest.webmanifest` + `public/sw.js` met alléén push-handlers, geen offline cache.
  - Service worker registreert alleen op de live-omgeving (viacust.com / lovable.app), niet in de editor-iframe.
- Server: edge function `send-push` verstuurt via `web-push` (VAPID).
- DB: tabel `push_subscriptions(user_id, endpoint, p256dh, auth, user_agent, last_used_at)`.
- VAPID-sleutels worden door mij gegenereerd en opgeslagen als `VAPID_PUBLIC_KEY` (publiek, mag in code) en `VAPID_PRIVATE_KEY` (geheim) + `VAPID_SUBJECT` (mailto:).
- De bestaande mail-trigger paths (`notify-ride-event`, `send-ride-invitations`) krijgen er één extra call bij naar `send-push` — mails blijven gewoon werken.
- Voorkeur uit `notification_preferences` wordt gerespecteerd: zet een gebruiker pushmeldingen voor "nieuwe aanvraag" uit, dan slaan we die push over (systeemmails blijven, zoals afgesproken).

## iOS belangrijk om te weten
Apple staat webpush alleen toe **nadat** de gebruiker de site via Safari aan het beginscherm heeft toegevoegd (iOS 16.4+). Op Android werkt het direct in Chrome. Daarom hoort er duidelijke uitleg in de UI: "Voeg eerst toe aan beginscherm, open vanaf het beginscherm, en klik dan op *Pushmeldingen aanzetten*."

## Te bouwen stappen
1. **Manifest + iconen + meta tags** zodat de app installeerbaar wordt (geen offline shell).
2. **Service worker** `public/sw.js` — alleen `push`- en `notificationclick`-handlers.
3. **Database**: tabel `push_subscriptions` met RLS (gebruiker beheert eigen subscripties).
4. **VAPID keys** genereren en als secrets opslaan.
5. **Edge function `send-push`**: leest subscripties voor een user, stuurt webpush, verwijdert verlopen (410/404).
6. **Frontend hook** `usePushSubscription`: registreert SW, vraagt permissie, slaat subscription op in DB.
7. **UI**: blokje in `NotificationPreferencesCard` met status + knop *Pushmeldingen aanzetten / uitzetten op dit apparaat*. Aparte iOS-uitlegtekst.
8. **Inhaken op events**: in `notify-ride-event` en `send-ride-invitations` een extra `send-push`-aanroep, met dezelfde voorkeurchecks.

## Wat niet
- Geen offline ondersteuning / cache van de app (om preview-problemen te voorkomen en omdat het niet nodig is).
- Geen native app (dat is optie B uit het vorige bericht).

Zal ik beginnen?