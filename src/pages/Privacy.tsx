import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string; toTerms: string }> = {
  nl: { kicker: "Privacy", title: "Privacyverklaring ViaCust", updated: "Versie 1.7 — Laatst bijgewerkt op: 5 juni 2026", back: "← Terug", toTerms: "Algemene voorwaarden" },
  en: { kicker: "Privacy", title: "Privacy Policy", updated: "Last updated: May 11, 2026", back: "← Back", toTerms: "Terms and Conditions" },
  de: { kicker: "Datenschutz", title: "Datenschutzerklärung ViaCust", updated: "Version 1.7 — Zuletzt aktualisiert am: 5. Juni 2026", back: "← Zurück", toTerms: "AGB" },
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
    <p>ViaCust (hierna: "wij", "ons" of "het platform") hecht grote waarde aan de bescherming van uw persoonsgegevens. In deze verklaring leggen wij uit welke gegevens wij verwerken via onze webapplicatie en de geïntegreerde Google Cloud-services, conform de Algemene Verordening Gegevensbescherming (AVG/GDPR) en het Google API Services User Data Policy.</p>

    <h2>1. Gebruik van Google API Services (Limited Use Policy)</h2>
    <p>ViaCust maakt gebruik van Google API-services om transportbegeleiding te automatiseren. Ons gebruik van informatie ontvangen via Google API's voldoet strikt aan het Google API Services User Data Policy, inclusief de vereisten voor beperkt gebruik (Limited Use).</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0:</strong> Veilig inloggen en autorisatie. Wij ontvangen uw naam, e-mailadres en profielfoto voor accountpersonalisatie.</li>
      <li><strong>Google Calendar API (v3):</strong> Gebruik van freeBusy (beschikbaarheid) en calendar.events (synchronisatie van ritten). Gegevens worden uitsluitend gebruikt om ritten in uw persoonlijke agenda te plaatsen en te synchroniseren.</li>
      <li><strong>Google Maps Platform:</strong> Gebruik van Maps JavaScript API en Geocoding API voor adresvalidatie, kaartweergave en het omzetten van GPS-coördinaten naar een fysiek adres (reverse-geocoding).</li>
    </ul>
    <p><strong>Beperking van gegevensdeling (Data Sharing Disclosure):</strong><br />
    Wij verkopen, verhandelen of verhuren uw Google-gebruikersgegevens niet aan derden. Gegevens die via de Google API's worden verkregen, worden op geen enkele wijze gedeeld met, overgedragen aan, of openbaar gemaakt aan externe diensten, commerciële partners, advertentienetwerken of marketingplatformen, tenzij dit strikt noodzakelijk is voor de kernfunctionaliteit en technische exploitatie van het platform (zoals de hostingpartners genoemd in Artikel 5) of om te voldoen aan dwingende wettelijke verplichtingen.</p>

    <h2>2. Gegevensbeschermingsmechanismen voor Gevoelige Gegevens</h2>
    <p>Wij hanteren strikte en robuuste technische en organisatorische beveiligingsmaatregelen om misbruik, verlies, onbevoegde toegang en ongeoorloofde wijziging van uw (gevoelige) persoonsgegevens en Google-gebruikersdata te voorkomen.</p>
    <ul>
      <li><strong>Versleuteling in transit (TLS/SSL):</strong> Alle datacommunicatie tussen de ViaCust-webapplicatie, onze servers en de Google API's verloopt via een beveiligde verbinding en is volledig versleuteld met behulp van up-to-date Transport Layer Security (TLS/SSL) protocollen.</li>
      <li><strong>Strikte data-isolatie (RLS):</strong> Binnen onze databaseomgeving dwingen wij strikte Row Level Security (RLS) policies af. Dit garandeert dat transportdata, ritten en agenda-instellingen uitsluitend toegankelijk zijn voor de specifiek geautoriseerde gebruiker en dat cross-site data-inzage technisch onmogelijk is.</li>
      <li><strong>Veilige server-side opslag:</strong> Google OAuth toegangstokens (access tokens en refresh tokens) worden nooit blootgesteld aan de frontend (de browser van de gebruiker) of onbevoegde partijen. Deze tokens worden strikt versleuteld en beveiligd opgeslagen in onze server-side databaseomgeving.</li>
    </ul>

    <h2>3. Gegevensverwerking en Doeleinden</h2>
    <p>Wij verwerken gegevens uitsluitend voor de volgende doelen:</p>
    <ul>
      <li><strong>Identificatie &amp; Contact:</strong> Naam, bedrijfsgegevens, BTW/KVK-nummer, e-mail en telefoonnummer voor het beheren van uw account, facturatie en rit-notificaties.</li>
      <li><strong>Administratieve Ritafhandeling:</strong> Gegevens over geplande ritten, de status van de opdracht en door de begeleider ingevoerde onkosten ten behoeve van de facturatie.</li>
      <li><strong>Tijdelijke Standplaats (GPS):</strong> Indien een begeleider handmatig de "Ik sta nu hier"-functie activeert, verwerken wij de actuele GPS-locatie van het toestel om de aanvoertijd voor ad-hoc ritten (binnen 3 uur) nauwkeurig te berekenen. Deze locatiegegevens zijn tijdelijk (naar keuze 2, 4, 8 of 12 uur geldig), worden niet permanent opgeslagen voor trackingdoeleinden en verlopen automatisch na de gekozen duur of bij handmatige uitschakeling.</li>
      <li><strong>Geplande Standplaats:</strong> Indien een begeleider vooraf een datum, tijdvenster en locatie invoert voor toekomstige beschikbaarheid ("Geplande standplaats"), bewaren en verwerken wij deze locatiegegevens uitsluitend om de matchings- en tarievenlogica voor toekomstige ritaanvragen binnen dat specifieke venster te berekenen.</li>
      <li><strong>Push-notificaties:</strong> Wij verwerken unieke browser-tokens om live updates (zoals acceptatie-timers en rit-waarschuwingen) rechtstreeks naar uw toestel te sturen via Web Push-notificaties.</li>
      <li><strong>Kwaliteitsbewaking &amp; Reviews:</strong> Wij verwerken beoordelingen en feedback die gebruikers over elkaar achterlaten op basis van ons gerechtvaardigd belang om de betrouwbaarheid van het platform te waarborgen.</li>
      <li><strong>Netwerkbeheer en Voorkeurslijsten:</strong>
        <ul>
          <li>Opdrachtgevers: Kunnen persoonlijke uitsluitingslijsten bijhouden om specifieke begeleiders te filteren voor eigen ritten.</li>
          <li>Begeleiders: Hebben het recht hun cliëntenportefeuille te beheren door voorkeuren aan te geven voor specifieke opdrachtgevers.</li>
        </ul>
      </li>
      <li><strong>Multi-voertuig &amp; Bedrijfsaccounts:</strong> Indien een gebruiker zich registraat als Bedrijfsplanner, verwerken wij de bedrijfsgegevens voor centrale facturatie en administratie. Indien deze planner chauffeurs uitnodigt, verwerken wij de e-mailadressen en accountgegevens van deze specifieke chauffeurs. De Bedrijfsplanner heeft inzicht in de aan de chauffeur toegewezen ritten, de rithistorie en de digitale ritbonnen ten behoeve van de centrale planning en kwaliteitsbewaking.</li>
    </ul>

    <h2>4. Validatie van bedrijfsgegevens (VIES)</h2>
    <p>Om de fiscale integriteit van het platform te waarborgen en te voldoen aan de Europese wetgeving met betrekking tot de verlegging van BTW bij grensoverschrijdende diensten, voert ViaCust een validatie uit van de door u verstrekte BTW-nummers.</p>
    <p>Wij maken hiervoor gebruik van het VIES-systeem (VAT Information Exchange System) van de Europese Commissie.</p>
    <p>Tijdens deze controle wordt uw BTW-nummer verzonden naar de centrale systemen van de Europese Unie om de geldigheid en de bijbehorende bedrijfsnaam/adresgegevens te verifiëren.</p>
    <p>Deze gegevens worden uitsluitend gebruikt voor het valideren van uw account en het opstellen van fiscaal correcte facturen op basis van de wekelijkse brandstofprijzen (o.a. conform TLN-index).</p>

    <h2>5. Sub-verwerkers</h2>
    <p>Wij maken gebruik van de volgende betrouwbare partners voor de exploitatie van het platform:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Data-opslag en hosting binnen de Europese Unie (EU).</li>
      <li><strong>Stripe:</strong> Veilige verwerking van betalingen en facturatiestromen.</li>
      <li><strong>Google Cloud Platform:</strong> Kaartdiensten, geocoding en OAuth-authenticatie.</li>
      <li><strong>Push Notification Services:</strong> De push-diensten van uw specifieke browser/besturingssysteem (zoals Google Firebase Cloud Messaging of Apple Push Notification service) voor het afleveren van live meldingen.</li>
    </ul>

    <h2>6. Bewaartermijnen</h2>
    <ul>
      <li><strong>Fiscale data &amp; Facturen:</strong> 7 jaar conform de wettelijke fiscale administratieplicht.</li>
      <li><strong>Tijdelijke GPS-locatie:</strong> Maximaal 12 uur, of korter indien de gekozen timer afloopt of handmatig wordt gewist.</li>
      <li><strong>Geplande standplaatsgegevens:</strong> Deze gegevens worden automatisch uit de database gewist of geanonimiseerd zodra het door de begeleider opgegeven tijdvenster is verstreken.</li>
      <li><strong>Beoordelingen:</strong> Zolang het bijbehorende account actief is op het platform.</li>
      <li><strong>OAuth-tokens &amp; Push-tokens:</strong> Onmiddellijke en definitieve verwijdering na het verbreken van de koppeling of het intrekken van de toestemming in uw browser.</li>
      <li><strong>Gekoppelde Chauffeursaccounts:</strong> Gegevens van chauffeurs gekoppeld aan een bedrijfsaccount blijven bewaard zolang de koppeling tussen het chauffeursprofiel en het bedrijfsaccount actief is, of totdat het hoofdaccount wordt beëindigd.</li>
    </ul>

    <h2>7. Uw Rechten en Contact</h2>
    <p>U heeft te allen tijde het recht op inzage, correctie, dataportabiliteit en verwijdering van uw persoonsgegevens. Daarnaast kunt u de gegeven toestemming voor push-notificaties of locatievoorzieningen op elk moment zelfstandig intrekken via de instellingen van uw browser of mobiele toestel.</p>
    <p>Voor vragen of het uitoefenen van uw rechten kunt u contact met ons opnemen via: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Nederland</p>
  </>
);

const PrivacyEN = () => (
  <>
    <p>ViaCust (hereinafter: "we", "us" or "the platform") values the protection of your personal data. This statement explains which data we process via our web application and integrated Google Cloud services, in accordance with the GDPR and the Google API Services User Data Policy.</p>

    <h2>1. Use of Google API Services (Limited Use Policy)</h2>
    <p>ViaCust uses Google API services to automate transport accompaniment. Our use of information received via Google APIs complies with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0:</strong> Secure sign-in and authorisation. We receive your name, email address and profile photo for account personalisation.</li>
      <li><strong>Google Calendar API (v3):</strong> Use of <code>freeBusy</code> (availability) and <code>calendar.events</code> (ride synchronisation). Data is used solely to place rides in your personal calendar and is not shared with third parties.</li>
      <li><strong>Google Maps Platform:</strong> Use of the Maps JavaScript API and Geocoding API for address validation, map display and reverse geocoding GPS coordinates.</li>
    </ul>

    <h2>2. Data processing and purposes</h2>
    <p>We process data exclusively for the following purposes:</p>
    <ul>
      <li><strong>Identification &amp; contact:</strong> Name, company details, VAT/CoC number, email and phone number to manage your account, billing and ride notifications.</li>
      <li><strong>Administrative ride handling:</strong> Data on scheduled rides, order status and expenses entered by the escort for billing purposes.</li>
      <li><strong>Temporary base location (GPS):</strong> If an escort manually activates the "I am here now" feature, we process the device's current GPS location to accurately calculate the travel time for ad-hoc rides (within 3 hours). This location data is temporary (valid for 2, 4, 8 or 12 hours of your choice), is not permanently stored for tracking and expires automatically.</li>
      <li><strong>Planned base location:</strong> If an escort enters a future date, time window and location ("Planned base"), we store and process this location data solely to compute matching and pricing logic for future ride requests within that specific window.</li>
      <li><strong>Push notifications:</strong> We process unique browser tokens to deliver live updates (such as acceptance timers and ride alerts) directly to your device via Web Push.</li>
      <li><strong>Quality monitoring &amp; reviews:</strong> We process the reviews and feedback users leave about each other on the basis of our legitimate interest in safeguarding platform reliability.</li>
      <li><strong>Network management and preference lists:</strong>
        <ul>
          <li>Clients: may maintain personal exclusion lists to filter specific escorts from their own rides.</li>
          <li>Escorts: may manage their client portfolio by setting preferences for specific clients.</li>
        </ul>
      </li>
      <li><strong>Multi-vehicle &amp; company accounts:</strong> If a user registers as a Company Planner, we process the company data for central billing. If this planner invites drivers, we process the email addresses and account data of those specific drivers. The Company Planner can view rides assigned to the driver, ride history and digital ride receipts for central planning and quality control.</li>
    </ul>

    <h2>3. Validation of company data (VIES)</h2>
    <p>To safeguard the platform's fiscal integrity and comply with European legislation on the reverse charge of VAT for cross-border services, ViaCust validates the VAT numbers you provide.</p>
    <p>We use the European Commission's VIES system (VAT Information Exchange System).</p>
    <p>During this check, your VAT number is sent to EU central systems to verify validity and the associated company name/address.</p>
    <p>This data is only used to validate your account and produce fiscally correct invoices based on weekly fuel prices (including the TLN index).</p>

    <h2>4. Sub-processors</h2>
    <p>We use the following trusted partners to operate the platform:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Data storage and hosting within the European Union (EU).</li>
      <li><strong>Stripe:</strong> Secure processing of payments and billing flows.</li>
      <li><strong>Google Cloud Platform:</strong> Map services, geocoding and OAuth authentication.</li>
      <li><strong>Push notification services:</strong> The push services of your specific browser/operating system (such as Google Firebase Cloud Messaging or Apple Push Notification service) for delivering live alerts.</li>
    </ul>

    <h2>5. Retention periods</h2>
    <ul>
      <li><strong>Fiscal data &amp; invoices:</strong> 7 years in line with the statutory tax record-keeping obligation.</li>
      <li><strong>Temporary GPS location:</strong> Maximum 12 hours, or shorter if the selected timer expires or is cleared manually.</li>
      <li><strong>Planned base location data:</strong> Automatically deleted from the database or anonymised once the time window provided by the escort has passed.</li>
      <li><strong>Reviews:</strong> For as long as the associated account is active on the platform.</li>
      <li><strong>OAuth tokens &amp; push tokens:</strong> Immediate and final deletion after disconnection or revocation in your browser.</li>
      <li><strong>Linked driver accounts:</strong> Data of drivers linked to a company account is retained as long as the link between the driver profile and the company account is active, or until the main account is terminated.</li>
    </ul>

    <h2>6. Your rights and contact</h2>
    <p>You have the right to access, correct, transfer and delete your personal data at any time. You may also withdraw consent for push notifications or location services at any time via your browser or device settings.</p>
    <p>For questions or to exercise your rights, contact us at: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />The Netherlands</p>
  </>
);

const PrivacyDE = () => (
  <>
    <p>ViaCust (nachfolgend: „wir", „uns" oder „die Plattform") legt großen Wert auf den Schutz Ihrer personenbezogenen Daten. In dieser Datenschutzerklärung erläutern wir, welche Daten wir über unsere Webanwendung und die integrierten Google Cloud-Dienste gemäß der Datenschutz-Grundverordnung (DSGVO) und der Google API Services-Nutzerdatenrichtlinie verarbeiten.</p>

    <h2>1. Nutzung von Google API-Diensten &amp; Datenweitergabe (Limited Use Policy)</h2>
    <p>ViaCust nutzt Google API-Dienste, um die Transportbegleitung und Dispositionsprozesse zu automatisieren. Unsere Nutzung von Informationen, die wir über Google-APIs erhalten, entspricht strikt der Google API Services-Nutzerdatenrichtlinie, einschließlich der Anforderungen für die eingeschränkte Nutzung (Limited Use).</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0:</strong> Sichere Anmeldung und Autorisierung. Wir erhalten Ihren Namen, Ihre E-Mail-Adresse und Ihr Profilbild zur Personalisierung Ihres Kontos.</li>
      <li><strong>Google Calendar API (v3):</strong> Nutzung von freeBusy (Verfügbarkeit) und calendar.events (Synchronisierung von Fahrten). Diese Daten werden ausschließlich verwendet, um Transportfahrten direkt in Ihrem persönlichen Kalender einzutragen und zu synchronisieren.</li>
      <li><strong>Google Maps Platform:</strong> Nutzung der Maps JavaScript API und der Geocoding API zur Adressvalidierung, Kartendarstellung und Umwandlung von GPS-Koordinaten in physische Adressen (Geokodierung in umgekehrter Richtung).</li>
    </ul>
    <p><strong>Offenlegung der Datenweitergabe (Data Sharing Disclosure):</strong><br />
    Wir verkaufen, handeln oder vermieten Ihre Google-Nutzerdaten nicht an Dritte. Daten, die über Google-APIs erhoben werden, werden in keiner Weise an externe Dienste, kommerzielle Partner, Werbenetzwerke oder Marketingplattformen weitergegeben, übertragen oder offengelegt, es sei denn, dies ist für die Kernfunktionalität und den technischen Betrieb der Plattform (wie die in Abschnitt 5 genannten Hosting-Partner) zwingend erforderlich oder erfolgt zur Erfüllung zwingender gesetzlicher Verpflichtungen.</p>

    <h2>2. Datensicherheitsmechanismen für sensible Daten</h2>
    <p>Wir setzen robuste, professionelle technische und organisatorische Sicherheitsmaßnahmen ein, um Missbrauch, Verlust, unbefugten Zugriff und unbefugte Änderung Ihrer (sensiblen) personenbezogenen Daten und Google-Nutzerdaten zu verhindern.</p>
    <ul>
      <li><strong>Verschlüsselung bei der Übertragung (TLS/SSL):</strong> Die gesamte Datenkommunikation zwischen der ViaCust-Anwendung, unseren Servern und den Google-APIs erfolgt über eine gesicherte Verbindung und ist nach dem aktuellen Stand der Technik mittels Transport Layer Security (TLS/SSL)-Protokollen vollständig verschlüsselt.</li>
      <li><strong>Strikte Datentrennung (RLS):</strong> Innerhalb unserer Datenbankinfrastruktur setzen wir strikte Row Level Security (RLS)-Richtlinien durch. Dies garantiert, dass Transportdaten, Fahrten und Kalendereinstellungen isoliert und nur für den jeweils autorisierten Nutzer zugänglich sind, wodurch eine mandantenübergreifende Dateneinsicht technisch unmöglich ist.</li>
      <li><strong>Sichere serverseitige Speicherung:</strong> Google OAuth-Authentifizierungstoken (access tokens und refresh tokens) werden niemals dem Frontend (dem Browser des Nutzers) oder unbefugten Dritten offengelegt. Diese Token werden streng verschlüsselt und sicher in unserer serverseitigen Datenbank gespeichert.</li>
    </ul>

    <h2>3. Datenverarbeitung und Zwecke</h2>
    <p>Wir verarbeiten personenbezogene Daten ausschließlich für die folgenden Zwecke:</p>
    <ul>
      <li><strong>Identifikation &amp; Kontakt:</strong> Name, Unternehmensdaten, Umsatzsteuer-Identifikationsnummer/Handelsregisternummer, E-Mail-Adresse und Telefonnummer zur Verwaltung Ihres Kontos, zur Abrechnung und für fahrtspezifische Benachrichtigungen.</li>
      <li><strong>Administrative Auftragsabwicklung:</strong> Daten zu geplanten Fahrten, Auftragsstati und vom Begleiter eingegebene Spesen zum Zwecke der Rechnungsstellung.</li>
      <li><strong>Temporärer Standort (GPS):</strong> Wenn ein Begleiter die Funktion „Ich stehe jetzt hier" manuell aktiviert, verarbeiten wir den aktuellen GPS-Standort des Geräts, um die Anfahrtszeit für Ad-hoc-Fahrten (innerhalb von 3 Stunden) präzise zu berechnen. Diese Standortdaten sind temporär (wahlweise 2, 4, 8 oder 12 Stunden gültig), werden nicht dauerhaft zu Tracking-Zwecken gespeichert und verlaufen automatisch nach Ablauf der gewählten Dauer oder bei manueller Deaktivierung.</li>
      <li><strong>Geplanter Standort:</strong> Wenn ein Begleiter vorab ein Datum, ein Zeitfenster und einen Standort für die zukünftige Verfügbarkeit eingibt („Geplanter Standort"), speichern und verarbeiten wir diese Standortdaten ausschließlich, um die Matching- und Tariflogik für zukünftige Fahrtanfragen innerhalb dieses spezifischen Zeitfensters zu berechnen.</li>
      <li><strong>Push-Benachrichtigungen:</strong> Wir verarbeiten eindeutige Browser-Token, um Live-Updates (wie Akzeptanz-Timer und Fahrtwarnungen) über Web-Push-Benachrichtigungen direkt an Ihr Gerät zu senden.</li>
      <li><strong>Qualitätssicherung &amp; Bewertungen:</strong> Wir verarbeiten Bewertungen und Feedback, die Nutzer übereinander hinterlassen, basierend auf unserem berechtigten Interesse, die Zuverlässigkeit und Sicherheit der Plattform zu gewährleisten.</li>
      <li><strong>Netzwerkmanagement und Präferenzlisten:</strong>
        <ul>
          <li>Auftraggeber: Können persönliche Ausschlusslisten führen, um bestimmte Begleiter für eigene Fahrten zu filtern.</li>
          <li>Begleiter: Haben das Recht, ihr Kundenportfolio zu verwalten, indem sie Präferenzen für bestimmte Auftraggeber angeben.</li>
        </ul>
      </li>
      <li><strong>Flotten- &amp; Unternehmenskonten:</strong> Wenn sich ein Nutzer als Unternehmensdisponent registriert, verarbeiten wir die Unternehmensdaten für die zentrale Rechnungsstellung und Verwaltung. Lädt dieser Disponent Fahrer ein, verarbeiten wir die E-Mail-Adressen und Kontodaten dieser spezifischen Fahrer. Der Unternehmensdisponent hat Einblick in die dem Fahrer zugewiesenen Fahrten, die Fahrthistorie und die digitalen Fahrtberichte zum Zwecke der zentralen Disposition und Qualitätssicherung.</li>
    </ul>

    <h2>4. Validierung von Unternehmensdaten (VIES)</h2>
    <p>Um die steuerliche Integrität der Plattform zu gewährleisten und die europäischen Rechtsvorschriften zur Umkehrung der Steuerschuldnerschaft (Reverse Charge) bei grenzüberschreitenden Dienstleistungen zu erfüllen, validiert ViaCust die von Ihnen angegebenen Umsatzsteuer-Identifikationsnummern.</p>
    <p>Wir nutzen für diese Überprüfung das VIES-System (VAT Information Exchange System) der Europäischen Kommission.</p>
    <p>Bei dieser Prüfung wird Ihre Umsatzsteuer-Identifikationsnummer an die zentralen Systeme der Europäischen Union übermittelt, um deren Gültigkeit sowie den zugehörigen Firmennamen und die Adressdaten zu verifizieren.</p>
    <p>Diese Daten werden ausschließlich zur Validierung Ihres Kontos und zur Erstellung steuerkonformer Rechnungen auf Basis der wöchentlichen Kraftstoffpreise (u.a. gemäß TLN-Index) verwendet.</p>

    <h2>5. Drittanbieter-Unterauftragsverarbeiter</h2>
    <p>Wir nutzen die folgenden vertrauenswürdigen Partner für den Betrieb und die Infrastruktur der Plattform:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Datenspeicherung und Hosting innerhalb der Europäischen Union (EU).</li>
      <li><strong>Stripe:</strong> Sichere Abwicklung von Zahlungen, Abonnements und Rechnungsstellungsprozessen.</li>
      <li><strong>Google Cloud Platform:</strong> Kartendienste, Geokodierung und OAuth-Authentifizierung.</li>
      <li><strong>Push-Benachrichtungsdienste:</strong> Die nativen Push-Dienste Ihres spezifischen Browsers/Betriebssystems (wie Google Firebase Cloud Messaging oder der Apple Push Notification Service), um Live-Warnungen bereitzustellen.</li>
    </ul>

    <h2>6. Datenaufbewahrungsfristen</h2>
    <ul>
      <li><strong>Steuerdaten &amp; Rechnungen:</strong> 7 Jahre gemäß den gesetzlichen steuerlichen Aufbewahrungspflichten.</li>
      <li><strong>Temporärer GPS-Standort:</strong> Maximal 12 Stunden, oder kürzer, wenn der ausgewählte Timer abläuft oder manuell gelöscht wird.</li>
      <li><strong>Geplante Standortdaten:</strong> Diese Daten werden automatisch aus der Datenbank gelöscht oder anonymisiert, sobald das vom Begleiter angegebene Zeitfenster abgelaufen ist.</li>
      <li><strong>Bewertungen &amp; Rezensionen:</strong> Solange das zugehörige Konto auf der Plattform aktiv bleibt.</li>
      <li><strong>OAuth-Token &amp; Push-Token:</strong> Sofortige und dauerhafte Löschung bei Trennung der Integration oder Widerruf der Einwilligung in Ihren Browsereinstellungen.</li>
      <li><strong>Verknüpfte Fahrerkonten:</strong> Daten von Fahrern, die mit einem Unternehmenskonto verknüpft sind, werden so lange aufbewahrt, wie die Verknüpfung zwischen dem Fahrerprofil und dem Unternehmenskonto aktiv ist, oder bis das Hauptkonto gekündigt wird.</li>
    </ul>

    <h2>7. Ihre Rechte und Kontaktinformationen</h2>
    <p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Datenübertragbarkeit und Löschung Ihrer personenbezogenen Daten. Darüber hinaus können Sie Ihre Einwilligung zu Push-Benachrichtigungen oder Standortdiensten jederzeit selbstständig über die Einstellungen Ihres Browsers oder Mobilgeräts widerrufen.</p>
    <p>Bei Fragen oder zur Ausübung Ihrer Rechte wenden Sie sich bitte an uns unter: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Niederlande</p>
  </>
);

const PrivacyFR = () => (
  <>
    <p>ViaCust (ci-après : « nous », « notre » ou « la plateforme ») accorde une grande importance à la protection de vos données personnelles. Cette déclaration explique quelles données nous traitons via notre application web et les services Google Cloud intégrés, conformément au RGPD et à la Google API Services User Data Policy.</p>

    <h2>1. Utilisation des services API Google (Limited Use Policy)</h2>
    <p>ViaCust utilise les services API de Google pour automatiser l'accompagnement de transport. Notre utilisation des informations reçues via les API Google est conforme à la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>.</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0 :</strong> Connexion et autorisation sécurisées. Nous recevons votre nom, votre adresse e-mail et votre photo de profil pour la personnalisation du compte.</li>
      <li><strong>Google Calendar API (v3) :</strong> Utilisation de <code>freeBusy</code> (disponibilité) et <code>calendar.events</code> (synchronisation des courses). Les données sont utilisées uniquement pour inscrire les courses dans votre agenda personnel et ne sont pas partagées avec des tiers.</li>
      <li><strong>Google Maps Platform :</strong> Utilisation de Maps JavaScript API et Geocoding API pour la validation d'adresses, l'affichage des cartes et le reverse-geocoding des coordonnées GPS.</li>
    </ul>

    <h2>2. Traitement des données et finalités</h2>
    <p>Nous traitons les données exclusivement pour les finalités suivantes :</p>
    <ul>
      <li><strong>Identification &amp; contact :</strong> Nom, données d'entreprise, numéro de TVA/CCI, e-mail et téléphone pour la gestion de votre compte, la facturation et les notifications de course.</li>
      <li><strong>Traitement administratif des courses :</strong> Données relatives aux courses planifiées, statut de la mission et frais saisis par l'accompagnateur pour la facturation.</li>
      <li><strong>Localisation temporaire (GPS) :</strong> Si un accompagnateur active manuellement la fonction « Je suis ici », nous traitons la position GPS actuelle de l'appareil afin de calculer précisément le temps de trajet pour les courses ad hoc (dans les 3 heures). Ces données sont temporaires (valables 2, 4, 8 ou 12 heures au choix), ne sont pas stockées de manière permanente et expirent automatiquement.</li>
      <li><strong>Position planifiée :</strong> Si un accompagnateur saisit à l'avance une date, une plage horaire et un lieu (« Position planifiée »), nous stockons et traitons ces données uniquement pour calculer la logique de mise en relation et de tarification pour les futures demandes dans cette plage.</li>
      <li><strong>Notifications push :</strong> Nous traitons des jetons de navigateur uniques pour envoyer des mises à jour en direct (minuteurs d'acceptation, alertes de course) directement sur votre appareil via Web Push.</li>
      <li><strong>Contrôle qualité &amp; avis :</strong> Nous traitons les évaluations et retours laissés par les utilisateurs entre eux sur la base de notre intérêt légitime à garantir la fiabilité de la plateforme.</li>
      <li><strong>Gestion du réseau et listes de préférences :</strong>
        <ul>
          <li>Donneurs d'ordre : peuvent tenir des listes d'exclusion personnelles afin de filtrer certains accompagnateurs pour leurs propres courses.</li>
          <li>Accompagnateurs : peuvent gérer leur portefeuille clients en indiquant des préférences pour certains donneurs d'ordre.</li>
        </ul>
      </li>
      <li><strong>Multi-véhicules &amp; comptes entreprise :</strong> Si un utilisateur s'inscrit en tant que planificateur d'entreprise, nous traitons les données de l'entreprise pour la facturation centralisée. Si ce planificateur invite des chauffeurs, nous traitons les adresses e-mail et données de compte de ces chauffeurs. Le planificateur d'entreprise peut consulter les courses assignées, l'historique et les bons de course numériques à des fins de planification et de contrôle qualité.</li>
    </ul>

    <h2>3. Validation des données d'entreprise (VIES)</h2>
    <p>Pour garantir l'intégrité fiscale de la plateforme et respecter la législation européenne sur l'autoliquidation de la TVA pour les services transfrontaliers, ViaCust valide les numéros de TVA que vous fournissez.</p>
    <p>Nous utilisons à cette fin le système VIES (VAT Information Exchange System) de la Commission européenne.</p>
    <p>Lors de cette vérification, votre numéro de TVA est transmis aux systèmes de l'UE pour vérifier sa validité ainsi que le nom et l'adresse de l'entreprise associés.</p>
    <p>Ces données sont uniquement utilisées pour valider votre compte et produire des factures fiscalement conformes basées sur les prix hebdomadaires du carburant (notamment l'indice TLN).</p>

    <h2>4. Sous-traitants</h2>
    <p>Nous faisons appel aux partenaires de confiance suivants pour l'exploitation de la plateforme :</p>
    <ul>
      <li><strong>Supabase / Vercel :</strong> Stockage des données et hébergement au sein de l'Union européenne (UE).</li>
      <li><strong>Stripe :</strong> Traitement sécurisé des paiements et des flux de facturation.</li>
      <li><strong>Google Cloud Platform :</strong> Services cartographiques, géocodage et authentification OAuth.</li>
      <li><strong>Services de notifications push :</strong> Les services push de votre navigateur/système d'exploitation (Google Firebase Cloud Messaging, Apple Push Notification service) pour la livraison des notifications en direct.</li>
    </ul>

    <h2>5. Durées de conservation</h2>
    <ul>
      <li><strong>Données fiscales &amp; factures :</strong> 7 ans conformément à l'obligation légale de conservation comptable.</li>
      <li><strong>Localisation GPS temporaire :</strong> 12 heures maximum, ou moins si le minuteur choisi expire ou est désactivé manuellement.</li>
      <li><strong>Données de position planifiée :</strong> Supprimées automatiquement de la base de données ou anonymisées une fois la plage horaire indiquée écoulée.</li>
      <li><strong>Avis :</strong> Tant que le compte associé est actif sur la plateforme.</li>
      <li><strong>Jetons OAuth &amp; jetons push :</strong> Suppression immédiate et définitive après déconnexion ou révocation depuis votre navigateur.</li>
      <li><strong>Comptes chauffeurs liés :</strong> Les données des chauffeurs liés à un compte entreprise sont conservées tant que le lien est actif, ou jusqu'à la résiliation du compte principal.</li>
    </ul>

    <h2>6. Vos droits et contact</h2>
    <p>Vous disposez à tout moment du droit d'accès, de rectification, de portabilité et de suppression de vos données personnelles. Vous pouvez également retirer votre consentement pour les notifications push ou la localisation à tout moment via les paramètres de votre navigateur ou appareil.</p>
    <p>Pour toute question ou pour exercer vos droits, contactez-nous à : <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Pays-Bas</p>
  </>
);


export default Privacy;
