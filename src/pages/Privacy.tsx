import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string; toTerms: string }> = {
  nl: { kicker: "Privacy", title: "Privacyverklaring", updated: "Laatst bijgewerkt: 11 mei 2026", back: "← Terug", toTerms: "Algemene voorwaarden" },
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
    <h2>1. Welke gegevens verzamelen wij?</h2>
    <p>Wij verwerken persoonsgegevens van Opdrachtgevers en Begeleiders die noodzakelijk zijn voor de kernfunctionaliteit van ons platform:</p>
    <ul>
      <li><strong>Accountgegevens:</strong> Naam, bedrijfsnaam, adres, e-mailadres en telefoonnummer.</li>
      <li><strong>Zakelijke gegevens:</strong> BTW-nummer, KVK-nummer en bankrekeningnummer (IBAN) voor facturatie en automatische incasso.</li>
      <li><strong>Locatiegegevens:</strong> Tijdens actieve ritten verwerken wij locatiegegevens om de voortgang van de opdracht te monitoren en brandstoftoeslagen te berekenen.</li>
      <li><strong>Google Gebruikersgegevens:</strong> Indien u uw Google Agenda koppelt aan ViaCust, verwerken wij specifieke data via de Google API-services.</li>
    </ul>

    <h2>2. Gebruik van Google API-gegevens (Google Agenda)</h2>
    <p>ViaCust biedt een synchronisatiefunctie met Google Agenda om uw planning te automatiseren.</p>
    <ul>
      <li><strong>Welke data gebruiken wij?</strong> Wij hebben uitsluitend toegang tot uw agenda-afspraken (lezen) en de mogelijkheid om nieuwe afspraken aan te maken (schrijven).</li>
      <li><strong>Doel:</strong> Wij lezen uw agenda uitsluitend om uw beschikbaarheid te bepalen (zonder de inhoud van privé-afspraken te delen met derden). Wij schrijven uitsluitend geaccepteerde transportopdrachten naar uw agenda.</li>
      <li><strong>Limited Use Policy:</strong> Het gebruik en de overdracht van informatie ontvangen via Google API's door ViaCust voldoet aan het <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, inclusief de vereisten voor 'Limited Use'.</li>
      <li><strong>Geen advertenties:</strong> Google-gebruikersgegevens worden onder geen beding gebruikt voor advertentiedoeleinden of gedeeld met externe partijen die niet noodzakelijk zijn voor de werking van de app.</li>
    </ul>

    <h2>3. Waarom verzamelen wij deze gegevens?</h2>
    <p>Wij gebruiken uw gegevens voor de volgende doeleinden:</p>
    <ul>
      <li>Het koppelen van opdrachtgevers aan beschikbare begeleiders.</li>
      <li>Het genereren van automatische wekelijkse verzamelfacturen.</li>
      <li>Het berekenen van brandstoftoeslagen en verwerken van onkosten.</li>
      <li>Het verifiëren van identiteit en vereiste vakbekwaamheidsdocumenten.</li>
    </ul>

    <h2>4. Delen van gegevens met derden</h2>
    <p>Wij verkopen uw gegevens nooit. Gegevens worden alleen gedeeld met:</p>
    <ul>
      <li><strong>De wederpartij:</strong> Zodra een rit is geaccepteerd, worden noodzakelijke contactgegevens gedeeld tussen Opdrachtgever en Begeleider.</li>
      <li><strong>Stripe:</strong> Onze betaalprovider voor de verwerking van abonnementen en commissies.</li>
      <li><strong>Cloud-infrastructuur:</strong> Uw data wordt veilig opgeslagen op versleutelde servers (SSL/HTTPS).</li>
    </ul>

    <h2>5. Bewaartermijnen</h2>
    <p>Wij bewaren gegevens niet langer dan noodzakelijk. Facturatiegegevens worden conform de wettelijke fiscale bewaarplicht 7 jaar bewaard. Accountgegevens worden verwijderd op het moment dat u uw account beëindigt.</p>

    <h2>6. Toegang intrekken en Verwijderen</h2>
    <p>U heeft te allen tijde het recht om uw gegevens in te zien of te laten verwijderen. U kunt uw Google-koppeling op elk moment intrekken via <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google-beveiligingsinstellingen</a>.</p>
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
