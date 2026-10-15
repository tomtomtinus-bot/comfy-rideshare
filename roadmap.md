# Roadmap — enterprise planning
- [x] 1. Documenten per rit (upload, download door begeleider)
- [x] 2. Rit dupliceren
- [x] 3. Conflict-/dubbele boekingsdetectie (wacht op go van gebruiker)
- [x] 4. Meerdere begeleiders per rit (V1/V2) (wacht op go)
- [x] 5. Wijzigingshistorie + "Gewijzigd"-markering (wacht op go)
- [x] 6. Geavanceerde export met datumbereik (wacht op go)

## Nieuwe prijzen (€19 / €49 / €99) overal doorvoeren
- [x] Tarievenpagina: 3 kaarten, geen fees/lancering, gelijke hoogte, donkerblauwe knoppen
- [x] Stripe: begeleider_monthly €19, opdrachtgever_monthly €49, vloot_monthly €99
- [x] Database: generate_platform_invoices zonder rit-/begeleidersfees, vaste bedragen 19/49/99, geen 6-maanden-korting
- [x] Database: monthly_subscription_fee is gedeprecieerd — de generator gebruikt vaste bedragen per soort account
- [x] Facturen van 1–15 okt. opnieuw gemaakt met €9,50 / €24,50 (oude onbetaalde run verwijderd)
- [x] Platformfactuur-pdf: abonnementsregel i.p.v. app-fee tabel
- [x] Teksten: Subscription.tsx, RequireSubscription.tsx, Settings.tsx planlabels, nl.ts (abonnementen, FAQ, profiel-, aanvraag-, teamteksten), Excel-export fee-kolom
- [x] Checkouts: proefperiode legt verplicht een betaalmethode vast (ook bij €19/€49/€99)
- [x] Vloot: €99-checkout in Subscription.tsx voor begeleidersbedrijven met meerdere leden; chauffeurslimiet opgeheven
- [ ] Controleren dat een vlootbedrijf met €99-abo ook daadwerkelijk een platformfactuur krijgt (pas mogelijk zodra een bedrijf 2+ leden heeft)

## Upload: backend-model voor 3 abonnementen (user-uploads://Implementeer_de_backend-logica_Supabase_pasted.md)
- [ ] Pakketkeuze vanaf Tarieven/Homepage meenemen in de aanmeldflow en opslaan bij het profiel
- [ ] Controleren of de drie dashboardroutes en de ritstatusstroom overeenkomen met wat er al staat
- [ ] RLS-check per pakket (planner eigen ritten, begeleider toegewezen ritten)
