import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string; toTerms: string }> = {
  nl: { kicker: "Privacy", title: "Privacyverklaring ViaCust", updated: "Versie 1.2 — Laatst bijgewerkt op: 12 mei 2026", back: "← Terug", toTerms: "Algemene voorwaarden" },
  en: { kicker: "Privacy", title: "Privacy Policy", updated: "Last updated: May 11, 2026", back: "← Back", toTerms: "Terms and Conditions" },
  de: { kicker: "Datenschutz", title: "Datenschutzerklärung", updated: "Zuletzt aktualisiert: 11. Mai 2026", back: "← Zurück", toTerms: "AGB" },
  fr: { kicker: "Confidentialité", title: "Politique de Confidentialité", updated: "Dernière mise à jour : 11 mai 2026", back: "← Retour", toTerms: "Conditions générales" },
};

const Privacy = () => {
  const { i18n } = useTranslation();
  const lang = (["nl", "en", "de", "fr"].includes(i18n.language) ? i18n.language : "nl") as Lang;
  const L = labels[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <article className="max-w-3xl mx-auto bg-card shadow-etched p-8 md:p-12 space-y-6">
          <header>
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
              {L.kicker}
            </p>
            <h1 className="font-display text-4xl text-brass-deep italic">{L.title}</h1>
            <p className="text-sm text-brass-deep/55 mt-2">{L.updated}</p>
          </header>

          <div className="space-y-5 text-sm leading-relaxed text-brass-deep/85 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-brass-deep [&_h2]:italic [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-brass-gold [&_a]:underline">
            {lang === "nl" && <PrivacyNL />}
            {lang === "en" && <PrivacyEN />}
            {lang === "de" && <PrivacyDE />}
            {lang === "fr" && <PrivacyFR />}
          </div>

          <div className="pt-6 border-t border-brass-deep/10 flex justify-between items-center">
            <Link to="/auth" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:text-brass-deep">
              {L.back}
            </Link>
            <Link to="/voorwaarden" className="text-xs uppercase tracking-widest font-semibold text-brass-deep/60 hover:text-brass-gold">
              {L.toTerms} →
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

const PrivacyNL = () => (
  <>
    <p>ViaCust (hierna: "wij", "ons" of "het platform") hecht grote waarde aan de bescherming van uw persoonsgegevens. In deze verklaring leggen wij uit welke gegevens wij verwerken via onze webapplicatie en de geïntegreerde Google Cloud-services, conform de AVG (GDPR) en het Google API Services User Data Policy.</p>

    <h2>1. Gebruik van Google API Services (Limited Use Policy)</h2>
    <p>ViaCust maakt gebruik van diverse Google API-services om transportbegeleiding te automatiseren. Ons gebruik van informatie ontvangen via Google API's voldoet volledig aan het <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>
    <ul>
      <li><strong>Google Identity & OAuth 2.0:</strong> Veilig inloggen en autorisatie via tokens.</li>
      <li><strong>Google Calendar API (v3):</strong> Gebruik van <code>freeBusy</code> (beschikbaarheid) en <code>calendar.events</code> (synchronisatie van ritten). Gegevens worden niet gedeeld met derden.</li>
      <li><strong>Google Maps Platform:</strong> Gebruik van Maps JavaScript, Geocoding, Directions en Places API's voor routeberekening, adresvalidatie en kaartweergave.</li>
    </ul>

    <h2>2. Gegevensverwerking en Doeleinden</h2>
    <p>Wij verwerken gegevens uitsluitend voor de volgende doelen:</p>
    <ul>
      <li><strong>Identificatie & Contact:</strong> Naam, bedrijfsgegevens, BTW/KVK-nummer, e-mail en telefoonnummer voor facturatie en rit-notificaties.</li>
      <li><strong>Logistiek:</strong> GPS-coördinaten en onkosten voor automatische brandstoftoeslag-berekening en ritmonitoring.</li>
      <li><strong>Kwaliteitsbewaking & Reviews:</strong> Wij verwerken beoordelingen en feedback die opdrachtgevers en begeleiders over elkaar achterlaten. Dit doen wij op basis van ons gerechtvaardigd belang om de kwaliteit en betrouwbaarheid van het platform te waarborgen.</li>
      <li><strong>Voorkeurslijsten (Uitsluiting):</strong> Wij verwerken data met betrekking tot persoonlijke voorkeurslijsten van opdrachtgevers. Dit stelt opdrachtgevers in staat om specifieke begeleiders uit te sluiten voor hun eigen toekomstige opdrachten. Deze gegevens zijn privaat en worden niet gedeeld met andere opdrachtgevers. Opdrachtgevers dienen een gegronde reden aan te geven waarom deze begeleider wordt uitgesloten.</li>
    </ul>

    <h2>3. Sub-verwerkers</h2>
    <p>Voor de exploitatie maken wij gebruik van:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Data-opslag en hosting (EU-servers).</li>
      <li><strong>Stripe:</strong> Beveiligde betalingsverwerking.</li>
      <li><strong>Google Cloud Platform:</strong> Kaartdiensten en agenda-integratie.</li>
    </ul>

    <h2>4. Bewaartermijnen</h2>
    <ul>
      <li><strong>Fiscale data:</strong> 7 jaar conform wettelijke administratieplicht.</li>
      <li><strong>Beoordelingen:</strong> Zolang het account actief is, of tot een verzoek tot verwijdering wordt ingediend (mits geen zwaarder wegend belang voor dossiervorming aanwezig is).</li>
      <li><strong>OAuth-tokens:</strong> Onmiddellijke verwijdering na het verbreken van de koppeling.</li>
    </ul>

    <h2>5. Beveiliging</h2>
    <p>Wij passen strikte beveiliging toe: SSL/TLS-versleuteling (HTTPS), AES-256 encryptie van databasevelden en regelmatige controles op toegangsbeheer.</p>

    <h2>6. Uw Rechten en Contact</h2>
    <p>U heeft recht op inzage, correctie, dataportabiliteit en verwijdering van uw gegevens. Indien u op een uitsluitingslijst bent geplaatst, heeft u het recht op uitleg en bezwaar, mits dit de bedrijfsvoering van de opdrachtgever niet onredelijk schaadt.</p>
    <p><strong>Contactgegevens:</strong><br />ViaCust<br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Nederland<br /><a href="mailto:privacy@viacust.com">privacy@viacust.com</a></p>
  </>
);

const PrivacyEN = () => (
  <>
    <h2>1. Introduction</h2>
    <p>ViaCust processes personal data in accordance with the GDPR.</p>

    <h2>2. Data Collection</h2>
    <p>We collect names, emails, phone numbers, and company details. If linked, we process Google Calendar tokens to manage availability and ride assignments.</p>

    <h2>3. Purpose</h2>
    <p>Data is used to facilitate transport accompaniment, manage accounts, and synchronize schedules.</p>

    <h2>4. Google API</h2>
    <p>Our use of Google API data adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>

    <h2>5. Storage</h2>
    <p>Data is stored within the EU.</p>

    <h2>6. Rights</h2>
    <p>You have the right to access, rectify, or delete your data at any time.</p>

    <h2>7. Contact</h2>
    <p><strong>ViaCust</strong> · <a href="mailto:info@viacust.com">info@viacust.com</a></p>
  </>
);

const PrivacyDE = () => (
  <>
    <h2>1. Einleitung</h2>
    <p>ViaCust verarbeitet personenbezogene Daten gemäß der DSGVO.</p>

    <h2>2. Datenerhebung</h2>
    <p>Wir erheben Namen, E-Mails, Telefonnummern und Unternehmensdaten. Bei Verknüpfung werden Google-Kalender-Tokens zur Verwaltung der Verfügbarkeit verarbeitet.</p>

    <h2>3. Zweck</h2>
    <p>Die Daten dienen der Vermittlung von Transportbegleitungen und der Synchronisierung von Terminen.</p>

    <h2>4. Google API</h2>
    <p>Die Nutzung von Google-Daten entspricht der <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>

    <h2>5. Speicherung</h2>
    <p>Die Daten werden innerhalb der EU gespeichert.</p>

    <h2>6. Rechte</h2>
    <p>Sie haben das Recht auf Auskunft, Berichtigung oder Löschung Ihrer Daten.</p>

    <h2>7. Kontakt</h2>
    <p><strong>ViaCust</strong> · <a href="mailto:info@viacust.com">info@viacust.com</a></p>
  </>
);

const PrivacyFR = () => (
  <>
    <h2>1. Introduction</h2>
    <p>ViaCust traite les données personnelles conformément au RGPD.</p>

    <h2>2. Collecte de données</h2>
    <p>Nous collectons les noms, e-mails, numéros de téléphone et données d'entreprise. En cas de connexion, les jetons Google Calendar sont traités.</p>

    <h2>3. Finalité</h2>
    <p>Les données sont utilisées pour la mise en relation et la synchronisation des plannings.</p>

    <h2>4. API Google</h2>
    <p>L'utilisation des données Google respecte la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>

    <h2>5. Stockage</h2>
    <p>Les données sont stockées au sein de l'UE.</p>

    <h2>6. Droits</h2>
    <p>Vous disposez d'un droit d'accès, de rectification ou de suppression de vos données.</p>

    <h2>7. Contact</h2>
    <p><strong>ViaCust</strong> · <a href="mailto:info@viacust.com">info@viacust.com</a></p>
  </>
);

export default Privacy;
