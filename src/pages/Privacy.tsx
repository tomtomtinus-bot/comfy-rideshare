import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string; toTerms: string }> = {
  nl: { kicker: "Privacy", title: "Privacyverklaring", updated: "Laatst bijgewerkt: 10 mei 2026", back: "← Terug", toTerms: "Algemene voorwaarden" },
  en: { kicker: "Privacy", title: "Privacy Policy", updated: "Last updated: May 10, 2026", back: "← Back", toTerms: "Terms and Conditions" },
  de: { kicker: "Datenschutz", title: "Datenschutzerklärung", updated: "Zuletzt aktualisiert: 10. Mai 2026", back: "← Zurück", toTerms: "AGB" },
  fr: { kicker: "Confidentialité", title: "Politique de Confidentialité", updated: "Dernière mise à jour : 10 mai 2026", back: "← Retour", toTerms: "Conditions générales" },
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
    <h2>1. Inleiding</h2>
    <p>ViaCust (hierna: "wij") biedt een digitaal platform voor de planning en het beheer van transportbegeleiding. Wij zetten ons in voor de bescherming van de privacy van onze gebruikers (Opdrachtgevers en Begeleiders) en verwerken persoonsgegevens in strikte overeenstemming met de Algemene Verordening Gegevensbescherming (AVG).</p>

    <h2>2. Welke gegevens verzamelen wij?</h2>
    <ul>
      <li><strong>Accountgegevens:</strong> Naam, e-mailadres, telefoonnummer en inloggegevens.</li>
      <li><strong>Profielgegevens:</strong> Bedrijfsnaam, voertuiggegevens en persoonlijke identificatie voor administratieve goedkeuring.</li>
      <li><strong>Ritgegevens:</strong> Startlocaties, bestemmingen, tijdstippen en statussen van transportritten.</li>
      <li><strong>Google Agenda Data:</strong> Indien u de Google-koppeling activeert, verwerken wij tijdelijke tokens om uw beschikbaarheid te lezen en ritten in uw agenda te plaatsen.</li>
    </ul>

    <h2>3. Doel en Rechtsgrondslag</h2>
    <ul>
      <li><strong>Uitvoering van de overeenkomst:</strong> Om ritten te plannen, begeleiders toe te wijzen en de communicatie tussen partijen mogelijk te maken.</li>
      <li><strong>Toestemming:</strong> Voor de optionele koppeling met Google Agenda. U kunt deze toestemming op elk moment intrekken door de verbinding te verbreken.</li>
      <li><strong>Gerechtvaardigd belang:</strong> Voor het beveiligen van het platform en de handmatige controle van nieuwe accounts door de beheerder.</li>
    </ul>

    <h2>4. Google API Gebruiksbeleid</h2>
    <p>Het gebruik van informatie die is ontvangen via Google API's voldoet aan het <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, inclusief de vereisten voor 'Limited Use'. Wij delen Google-agendagegevens nooit met derden voor marketingdoeleinden.</p>

    <h2>5. Cookies en Opslag</h2>
    <p>Wij maken gebruik van functionele cookies en <code>browser local storage</code> om uw inlogsessie veilig te beheren en uw gebruikersvoorkeuren te onthouden. Deze zijn technisch essentieel voor de werking van het platform.</p>

    <h2>6. Gegevensdeling met Derden</h2>
    <p>Wij verkopen geen gegevens aan derden. Uw gegevens worden alleen gedeeld met:</p>
    <ul>
      <li><strong>Onze cloud-infrastructuurpartner:</strong> data-opslag vindt plaats binnen de EU.</li>
      <li><strong>Tussen Gebruikers:</strong> Gegevens zoals contactinformatie en ritdetails worden gedeeld tussen de opdrachtgever en de toegewezen begeleider voor de correcte uitvoering van de rit.</li>
    </ul>

    <h2>7. Beveiliging</h2>
    <ul>
      <li><strong>Row Level Security (RLS):</strong> Zorgt ervoor dat gebruikers alleen toegang hebben tot hun eigen data.</li>
      <li><strong>OAuth2-protocollen:</strong> Voor veilige authenticatie zonder dat wij uw wachtwoorden inzien.</li>
      <li><strong>Versleuteling:</strong> Alle dataverkeer vindt plaats via beveiligde SSL/TLS-verbindingen.</li>
    </ul>

    <h2>8. Uw Rechten</h2>
    <p>U heeft het recht op inzage, correctie of verwijdering van uw persoonsgegevens. Daarnaast heeft u het recht op dataportabiliteit en kunt u bezwaar maken tegen de verwerking. Voor het uitoefenen van deze rechten of het intrekken van toestemming kunt u terecht in uw accountinstellingen of contact met ons opnemen.</p>

    <h2>9. Contact</h2>
    <p>Voor vragen over deze privacyverklaring: <strong>Tiny Paashuis — ViaCust</strong> · <a href="mailto:info@viacust.com">info@viacust.com</a></p>
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
