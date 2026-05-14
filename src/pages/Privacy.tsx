import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string; toTerms: string }> = {
  nl: { kicker: "Privacy", title: "Privacyverklaring ViaCust", updated: "Versie 1.4 — Laatst bijgewerkt op: 13 mei 2026", back: "← Terug", toTerms: "Algemene voorwaarden" },
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
            <p className="text-sm text-brass-deep/50 italic mt-2"> </p>
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
    <p>ViaCust maakt gebruik van Google API-services om transportbegeleiding te automatiseren. Ons gebruik van informatie ontvangen via Google API's voldoet aan het <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0:</strong> Veilig inloggen en autorisatie. Wij ontvangen uw naam, e-mailadres en profielfoto voor accountpersonalisatie.</li>
      <li><strong>Google Calendar API (v3):</strong> Gebruik van <code>freeBusy</code> (beschikbaarheid) en <code>calendar.events</code> (synchronisatie van ritten). Gegevens worden niet gedeeld met derden.</li>
      <li><strong>Google Maps Platform:</strong> Gebruik van Maps JavaScript API voor adresvalidatie en kaartweergave.</li>
    </ul>

    <h2>2. Gegevensverwerking en Doeleinden</h2>
    <p>Wij verwerken gegevens uitsluitend voor de volgende doelen:</p>
    <ul>
      <li><strong>Identificatie &amp; Contact:</strong> Naam, bedrijfsgegevens, BTW/KVK-nummer, e-mail en telefoonnummer voor het beheren van uw account, facturatie en rit-notificaties.</li>
      <li><strong>Administratieve Ritafhandeling:</strong> Gegevens over geplande ritten, de status van de opdracht en door de begeleider ingevoerde onkosten ten behoeve van de facturatie. Wij verzamelen <strong>geen</strong> live GPS-locaties of actieve monitoringgegevens.</li>
      <li><strong>Kwaliteitsbewaking &amp; Reviews:</strong> Wij verwerken beoordelingen en feedback die gebruikers over elkaar achterlaten op basis van ons gerechtvaardigd belang om de betrouwbaarheid van het platform te waarborgen.</li>
      <li><strong>Netwerkbeheer en Voorkeurslijsten:</strong>
        <ul>
          <li>Opdrachtgevers: Kunnen persoonlijke uitsluitingslijsten bijhouden om specifieke begeleiders te filteren voor eigen ritten.</li>
          <li>Begeleiders: Hebben het recht hun cliëntenportefeuille te beheren door voorkeuren aan te geven voor specifieke opdrachtgevers.</li>
        </ul>
      </li>
    </ul>

    <h2>3. Validatie van bedrijfsgegevens (VIES)</h2>
    <p>Om de fiscale integriteit van het platform te waarborgen en te voldoen aan de Europese wetgeving met betrekking tot de verlegging van BTW bij grensoverschrijdende diensten, voert ViaCust een validatie uit van de door u verstrekte BTW-nummers.</p>
    <p>Wij maken hiervoor gebruik van het VIES-systeem (VAT Information Exchange System) van de Europese Commissie.</p>
    <p>Tijdens deze controle wordt uw BTW-nummer verzonden naar de centrale systemen van de Europese Unie om de geldigheid en de bijbehorende bedrijfsnaam/adresgegevens te verifiëren.</p>
    <p>Deze gegevens worden uitsluitend gebruikt voor het valideren van uw account en het opstellen van fiscaal correcte facturen.</p>

    <h2>4. Sub-verwerkers</h2>
    <p>Wij maken gebruik van:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Data-opslag in de EU.</li>
      <li><strong>Stripe:</strong> Betalingen.</li>
      <li><strong>Google Cloud Platform:</strong> Kaartdiensten en login.</li>
    </ul>

    <h2>4. Bewaartermijnen</h2>
    <ul>
      <li><strong>Fiscale data:</strong> 7 jaar conform wettelijke administratieplicht.</li>
      <li><strong>Beoordelingen:</strong> Zolang het account actief is.</li>
      <li><strong>OAuth-tokens:</strong> Onmiddellijke verwijdering na het verbreken van de koppeling.</li>
    </ul>

    <h2>5. Uw Rechten en Contact</h2>
    <p>U heeft recht op inzage, correctie en verwijdering van uw gegevens. Voor vragen: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Nederland</p>
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
