import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { Button } from "@/components/ui/button";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { title: string; updated: string; back: string; toTerms: string }> = {
  nl: { title: "Privacyverklaring", updated: "Laatst bijgewerkt: juni 2026", back: "Terug", toTerms: "Algemene voorwaarden" },
  en: { title: "Privacy Policy", updated: "Last updated: June 2026", back: "Back", toTerms: "Terms and Conditions" },
  de: { title: "Datenschutzerklärung", updated: "Zuletzt aktualisiert: Juni 2026", back: "Zurück", toTerms: "AGB" },
  fr: { title: "Politique de Confidentialité", updated: "Dernière mise à jour : juin 2026", back: "Retour", toTerms: "Conditions générales" },
};

const seoByLang: Record<Lang, { title: string; description: string; canonical: string }> = {
  nl: {
    title: "Privacyverklaring | ViaCust",
    description: "Bekijk hoe ViaCust uw persoonsgegevens en Google Cloud-data veilig verwerkt conform de AVG.",
    canonical: "https://viacust.com/privacy",
  },
  en: {
    title: "Privacy Policy | ViaCust",
    description: "Read how ViaCust securely handles your personal data and Google Cloud integration in accordance with the GDPR.",
    canonical: "https://viacust.com/privacy-en",
  },
  de: {
    title: "Datenschutzerklärung | ViaCust",
    description: "Erfahren Sie, wie ViaCust Ihre personenbezogenen Daten und die Google Cloud-Integration gemäß der DSGVO schützt.",
    canonical: "https://viacust.com/datenschutz",
  },
  fr: {
    title: "Politique de Confidentialité | ViaCust",
    description: "Découvrez comment ViaCust protège vos données personnelles et l'intégration Google Cloud conformément au RGPD.",
    canonical: "https://viacust.com/confidentialite",
  },
};

interface PrivacyProps {
  forceLang?: Lang;
}

const Privacy = ({ forceLang }: PrivacyProps = {}) => {
  const { i18n } = useTranslation();
  const lang: Lang = forceLang ?? ((["nl", "en", "de", "fr"].includes(i18n.language) ? i18n.language : "nl") as Lang);
  const L = labels[lang];
  const seo = seoByLang[lang];

  useEffect(() => {
    if (forceLang && i18n.language !== forceLang) {
      i18n.changeLanguage(forceLang);
    }
  }, [forceLang, i18n]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title={seo.title} description={seo.description} canonical={seo.canonical} />
      <Nav />
      <main className="px-6 md:px-8 py-8 md:py-12">
        <article className="max-w-3xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{L.title}</h1>
            <p className="text-sm text-muted-foreground">{L.updated}</p>
          </header>

          <div className="space-y-5 text-sm leading-relaxed text-foreground/85 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80">
            {lang === "nl" && <PrivacyNL />}
            {lang === "en" && <PrivacyEN />}
            {lang === "de" && <PrivacyDE />}
            {lang === "fr" && <PrivacyFR />}
          </div>

          <div className="pt-6 border-t border-border flex justify-between items-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">{L.back}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/voorwaarden">{L.toTerms}</Link>
            </Button>
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
      <li><strong>Accountgegevens na opzegging:</strong> Na opzegging van het account worden persoonsgegevens 30 dagen bewaard en daarna automatisch verwijderd.</li>
    </ul>

    <h2>7. Uw Rechten en Contact</h2>
    <p>U heeft te allen tijde het recht op inzage, correctie, dataportabiliteit en verwijdering van uw persoonsgegevens. Daarnaast kunt u de gegeven toestemming voor push-notificaties of locatievoorzieningen op elk moment zelfstandig intrekken via de instellingen van uw browser of mobiele toestel.</p>
    <p>Voor vragen of het uitoefenen van uw rechten kunt u contact met ons opnemen via: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Nederland</p>
  </>
);

const PrivacyEN = () => (
  <>
    <p>ViaCust (hereinafter: "we", "us", or "the platform") is highly committed to protecting your personal data. In this privacy policy, we explain how we process your data through our web application and integrated Google Cloud services, in accordance with the General Data Protection Regulation (GDPR) and the Google API Services User Data Policy.</p>

    <h2>1. Use of Google API Services &amp; Data Sharing (Limited Use Policy)</h2>
    <p>ViaCust utilizes Google API services to automate transport guidance and escorting workflows. Our use of information received from Google APIs strictly adheres to the Google API Services User Data Policy, including the Limited Use requirements.</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0:</strong> Secure login and authorization. We receive your name, email address, and profile picture for account personalization.</li>
      <li><strong>Google Calendar API (v3):</strong> Use of freeBusy (availability) and calendar.events (ride synchronization). This data is exclusively used to inject and synchronize transport rides directly within your personal calendar.</li>
      <li><strong>Google Maps Platform:</strong> Use of Maps JavaScript API and Geocoding API for address validation, map rendering, and converting GPS coordinates into physical addresses (reverse-geocoding).</li>
    </ul>
    <p><strong>Data Sharing Disclosure:</strong><br />
    We do not sell, trade, or rent your Google user data to third parties. Data obtained via Google APIs is not shared with, transferred to, or disclosed to external services, commercial partners, advertising networks, or marketing platforms in any way, shape, or form, except as strictly required to provide the core scheduling functionalities and technical operation of the application (such as the hosting partners listed in Section 5) or to comply with compelling legal obligations.</p>

    <h2>2. Data Protection Mechanisms for Sensitive Data</h2>
    <p>We implement robust, enterprise-grade technical and organizational security measures to prevent the misuse, loss, unauthorized access, and unauthorized alteration of your (sensitive) personal data and Google user data.</p>
    <ul>
      <li><strong>Encryption in Transit (TLS/SSL):</strong> All data communication between the ViaCust application, our servers, and Google APIs is strongly encrypted using industry-standard Transport Layer Security (TLS/SSL) protocols.</li>
      <li><strong>Strict Data Isolation (RLS):</strong> Within our database infrastructure, we enforce strict Row Level Security (RLS) policies. This guarantees that transport data, rides, and calendar settings are isolated and only accessible to the specifically authorized user, making cross-site data exposure technically impossible.</li>
      <li><strong>Secure Server-Side Storage:</strong> Google OAuth authentication tokens (access tokens and refresh tokens) are never exposed to the frontend (the user's browser) or unauthorized third parties. These tokens are securely stored using encrypted, server-side database storage.</li>
    </ul>

    <h2>3. Data Processing and Purposes</h2>
    <p>We process personal data solely for the following objectives:</p>
    <ul>
      <li><strong>Identification &amp; Contact:</strong> Name, business details, VAT/CoC (KVK) number, email, and phone number to manage your account, billing, and ride notifications.</li>
      <li><strong>Administrative Ride Management:</strong> Data regarding scheduled rides, assignment statuses, and expenses entered by the escort for invoicing purposes.</li>
      <li><strong>Temporary Base Location (GPS):</strong> If an escort manually activates the "I am here now" feature, we process the active GPS location of the device to accurately calculate arrival times for ad-hoc rides (within 3 hours). This location data is temporary (valid for 2, 4, 8, or 12 hours by choice), is not permanently stored for tracking purposes, and expires automatically after the selected duration or upon manual deactivation.</li>
      <li><strong>Scheduled Base Location:</strong> If an escort pre-enters a date, time window, and location for future availability ("Scheduled base location"), we store and process this location data exclusively to calculate the matching and pricing logic for future ride requests within that specific timeframe.</li>
      <li><strong>Push Notifications:</strong> We process unique browser tokens to send live updates (such as acceptance timers and ride alerts) directly to your device via Web Push Notifications.</li>
      <li><strong>Quality Control &amp; Reviews:</strong> We process ratings and feedback that users leave about each other based on our legitimate interest to ensure the reliability and safety of the platform.</li>
      <li><strong>Network Management and Preference Lists:</strong>
        <ul>
          <li><strong>Clients:</strong> Can maintain personal exclusion lists to filter out specific escorts for their own rides.</li>
          <li><strong>Escorts:</strong> Have the right to manage their client portfolio by indicating preferences for specific clients.</li>
        </ul>
      </li>
      <li><strong>Multi-Vehicle &amp; Corporate Accounts:</strong> If a user registers as a Corporate Planner, we process business data for centralized invoicing and administration. If this planner invites drivers, we process the email addresses and account details of those specific drivers. The Corporate Planner has insight into the rides assigned to the driver, ride history, and digital ride logs for centralized scheduling and quality assurance purposes.</li>
    </ul>

    <h2>4. Validation of Corporate Data (VIES)</h2>
    <p>To ensure the fiscal integrity of the platform and to comply with European legislation regarding the reverse charge of VAT on cross-border services, ViaCust validates the VAT numbers provided by you.</p>
    <p>We utilize the VIES (VAT Information Exchange System) system of the European Commission for this verification.</p>
    <p>During this check, your VAT number is transmitted to the central systems of the European Union to verify its validity and the associated company name/address details.</p>
    <p>This data is used solely for validating your account and generating fiscally compliant invoices based on weekly fuel prices (including compliance with the TLN index).</p>

    <h2>5. Third-Party Sub-Processors</h2>
    <p>We utilize the following trusted partners for the operation and infrastructure of the platform:</p>
    <ul>
      <li><strong>Supabase / Vercel:</strong> Data storage and hosting within the European Union (EU).</li>
      <li><strong>Stripe:</strong> Secure processing of payments, subscriptions, and invoicing workflows.</li>
      <li><strong>Google Cloud Platform:</strong> Map services, geocoding, and OAuth authentication.</li>
      <li><strong>Push Notification Services:</strong> The native push services of your specific browser/operating system (such as Google Firebase Cloud Messaging or Apple Push Notification service) to deliver live alerts.</li>
    </ul>

    <h2>6. Data Retention Periods</h2>
    <ul>
      <li><strong>Fiscal Data &amp; Invoices:</strong> 7 years in accordance with statutory tax administration obligations.</li>
      <li><strong>Temporary GPS Location:</strong> Maximum of 12 hours, or shorter if the selected timer expires or is manually deleted.</li>
      <li><strong>Scheduled Base Location Data:</strong> This data is automatically deleted or anonymized from the database as soon as the time window specified by the escort expires.</li>
      <li><strong>Reviews &amp; Ratings:</strong> As long as the associated account remains active on the platform.</li>
      <li><strong>OAuth Tokens &amp; Push Tokens:</strong> Immediate and permanent deletion upon disconnecting the integration or revoking permission in your browser settings.</li>
      <li><strong>Linked Driver Accounts:</strong> Data of drivers linked to a corporate account will be retained as long as the connection between the driver profile and the corporate account is active, or until the primary account is terminated.</li>
      <li><strong>Account data after cancellation:</strong> After account cancellation, personal data is retained for 30 days and then automatically deleted.</li>
    </ul>

    <h2>7. Your Rights and Contact Information</h2>
    <p>You retain the right to access, rectify, transfer, and request the erasure of your personal data at any time. Additionally, you can independently revoke your consent for push notifications or location services at any moment through the settings of your browser or mobile device.</p>
    <p>For any questions or to exercise your rights, please contact us at: <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
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
    <p>ViaCust (ci-après : « nous », « notre » ou « la plateforme ») accorde une grande importance à la protection de vos données personnelles. Dans cette déclaration, nous expliquons quelles données nous traitons via notre application web et les services intégrés de Google Cloud, conformément au Règlement Général sur la Protection des Données (RGPD) et aux Règles de Google relatives aux données de l'utilisateur des services d'API.</p>

    <h2>1. Utilisation des services d'API Google &amp; Partage des données (Politique d'utilisation limitée)</h2>
    <p>ViaCust utilise les services d'API Google pour automatiser l'accompagnement des transports et les processus de planification. Notre utilisation des informations reçues via les API Google est strictement conforme aux Règles de Google relatives aux données de l'utilisateur des services d'API, y compris les exigences d'utilisation limitée (Limited Use).</p>
    <ul>
      <li><strong>Google Identity &amp; OAuth 2.0 :</strong> Connexion et autorisation sécurisées. Nous recevons votre nom, votre adresse e-mail et votre photo de profil pour la personnalisation de votre compte.</li>
      <li><strong>Google Calendar API (v3) :</strong> Utilisation de freeBusy (disponibilité) et calendar.events (synchronisation des trajets). Ces données sont exclusivement utilisées pour inscrire et synchroniser les trajets de transport directement dans votre calendrier personnel.</li>
      <li><strong>Google Maps Platform :</strong> Utilisation de l'API Maps JavaScript et de l'API Geocoding pour la validation des adresses, l'affichage des cartes et la conversion des coordonnées GPS en adresses physiques (géocodage inversé).</li>
    </ul>
    <p><strong>Divulgation sur le partage des données (Data Sharing Disclosure) :</strong><br />
    Nous ne vendons, n'échangeons ni ne louons vos données d'utilisateur Google à des tiers. Les données obtenues via les API Google ne sont en aucun cas partagées, transférées ou divulguées à des services externes, des partenaires commerciaux, des réseaux publicitaires ou des plateformes de marketing, sauf si cela est strictement nécessaire pour la fonctionnalité de base et l'exploitation technique de la plateforme (comme les partenaires d'hébergement mentionnés à l'Article 5) ou pour se conformer à des obligations légales impératives.</p>

    <h2>2. Mécanismes de protection des données pour les données sensibles</h2>
    <p>Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles robustes et professionnelles pour empêcher l'utilisation abusive, la perte, l'accès non autorisé et la modification non autorisée de vos données personnelles (sensibles) et de vos données d'utilisateur Google.</p>
    <ul>
      <li><strong>Chiffrement en transit (TLS/SSL) :</strong> Toutes les communications de données entre l'application ViaCust, nos serveurs et les API Google passent par une connexion sécurisée et sont entièrement chiffrées selon l'état de l'art à l'aide des protocoles Transport Layer Security (TLS/SSL).</li>
      <li><strong>Isolation stricte des données (RLS) :</strong> Au sein de notre infrastructure de base de données, nous appliquons des politiques strictes de sécurité au niveau des lignes (Row Level Security - RLS). Cela garantit que les données de transport, les trajets et les paramètres du calendrier sont isolés et uniquement accessibles à l'utilisateur spécifiquement autorisé, rendant toute consultation de données inter-clients techniquement impossible.</li>
      <li><strong>Stockage sécurisé côté serveur :</strong> Les jetons d'authentification Google OAuth (access tokens et refresh tokens) ne sont jamais exposés au frontend (le navigateur de l'utilisateur) ni à des tiers non autorisés. Ces jetons sont stockés de manière strictement chiffrée et sécurisée dans notre base de données côté serveur.</li>
    </ul>

    <h2>3. Traitement des données et finalités</h2>
    <p>Nous traitons les données personnelles exclusivement pour les finalités suivantes :</p>
    <ul>
      <li><strong>Identification &amp; Contact :</strong> Nom, coordonnées de l'entreprise, numéro de TVA/numéro d'enregistrement au registre du commerce, adresse e-mail et numéro de téléphone pour la gestion de votre compte, la facturation et les notifications relatives aux trajets.</li>
      <li><strong>Gestion administrative des trajets :</strong> Données sur les trajets planifiés, les statuts des missions et les frais saisis par l'accompagnateur à des fins de facturation.</li>
      <li><strong>Position de base temporaire (GPS) :</strong> Si un accompagnateur active manuellement la fonction « Je suis ici maintenant », nous traitons la position GPS active de l'appareil pour calculer avec précision les temps d'approche pour les trajets ad-hoc (dans les 3 heures). Ces données de localisation sont temporaires (valables au choix pour une durée de 2, 4, 8 ou 12 heures), ne sont pas stockées de manière permanente à des fins de suivi et expirent automatiquement après la durée choisie ou en cas de désactivation manuelle.</li>
      <li><strong>Position de base planifiée :</strong> Si un accompagnateur saisit à l'avance une date, un créneau horaire et un lieu pour sa disponibilité future (« Position planifiée »), nous stockons et traitons ces données de localisation exclusivement pour calculer la logique de mise en relation et de tarification des futures demandes de trajets dans ce créneau spécifique.</li>
      <li><strong>Notifications Push :</strong> Nous traitons des jetons de navigateur uniques pour envoyer des mises à jour en direct (telles que les compteurs d'acceptation et les alertes de trajet) via des notifications Web Push directement sur votre appareil.</li>
      <li><strong>Contrôle qualité &amp; Avis :</strong> Nous traitons les évaluations et les commentaires que les utilisateurs laissent les uns sur les autres sur la base de notre intérêt légitime à garantir la fiabilité et la sécurité de la plateforme.</li>
      <li><strong>Gestion du réseau et listes de préférences :</strong>
        <ul>
          <li>Clients : Peuvent maintenir des listes d'exclusion personnelles pour filtrer certains accompagnateurs pour leurs propres trajets.</li>
          <li>Accompagnateurs : Ont le droit de gérer leur portefeuille de clients en indiquant leurs préférences pour certains clients.</li>
        </ul>
      </li>
      <li><strong>Comptes de flotte &amp; d'entreprise :</strong> Si un utilisateur s'enregistre en tant que planificateur d'entreprise, nous traitons les données de l'entreprise pour la facturation et l'administration centralisées. Si ce planificateur invite des conducteurs, nous traitons les adresses e-mail et les données de compte de ces conducteurs spécifiques. Le planificateur d'entreprise a un aperçu des trajets attribués au conducteur, de l'historique des trajets et des rapports de trajet numériques à des fins de planification centrale et d'assurance qualité.</li>
    </ul>

    <h2>4. Validation des données d'entreprise (VIES)</h2>
    <p>Afin de garantir l'intégrité fiscale de la plateforme et de se conformer à la législation européenne relative à l'autoliquidation de la TVA (Reverse Charge) sur les services transfrontaliers, ViaCust valide les numéros de TVA que vous fournissez.</p>
    <p>Nous utilisons pour cette vérification le système VIES (VAT Information Exchange System) de la Commission européenne.</p>
    <p>Lors de ce contrôle, votre numéro de TVA est transmis aux systèmes centraux de l'Union européenne afin de vérifier sa validité ainsi que le nom de l'entreprise et les coordonnées de l'adresse associés.</p>
    <p>Ces données sont utilisées uniquement pour valider votre compte et générer des factures conformes fiscalement sur la base des prix hebdomadaires du carburant (notamment en conformité avec l'indice TLN).</p>

    <h2>5. Sous-traitants tiers</h2>
    <p>Nous faisons appel aux partenaires de confiance suivants pour l'exploitation et l'infrastructure de la plateforme :</p>
    <ul>
      <li><strong>Supabase / Vercel :</strong> Stockage des données et hébergement au sein de l'Union européenne (UE).</li>
      <li><strong>Stripe :</strong> Traitement sécurisé des paiements, des abonnements et des flux de facturation.</li>
      <li><strong>Google Cloud Platform :</strong> Services de cartographie, géocodage et authentification OAuth.</li>
      <li><strong>Services de notifications push :</strong> Les services push natifs de votre navigateur/système d'exploitation spécifique (tels que Google Firebase Cloud Messaging ou le service Apple Push Notification) pour fournir des alertes en direct.</li>
    </ul>

    <h2>6. Délais de conservation des données</h2>
    <ul>
      <li><strong>Données fiscales &amp; Factures :</strong> 7 ans conformément aux obligations légales de conservation de l'administration fiscale.</li>
      <li><strong>Position GPS temporaire :</strong> Maximum 12 heures, ou moins si le minuteur sélectionné expire ou est supprimé manuellement.</li>
      <li><strong>Données de position planifiée :</strong> Ces données sont automatiquement supprimées ou anonymisées de la base de données dès que le créneau horaire spécifié par l'accompagnateur expire.</li>
      <li><strong>Évaluations &amp; Avis :</strong> Tant que le compte associé reste actif sur la plateforme.</li>
      <li><strong>Jetons OAuth &amp; Jetons Push :</strong> Suppression immédiate et définitive lors de la déconnexion de l'intégration ou du retrait du consentement dans les paramètres de votre navigateur.</li>
      <li><strong>Comptes de conducteurs liés :</strong> Les données des conducteurs liés à un compte d'entreprise seront conservées tant que la liaison entre le profil du conducteur et le compte de l'entreprise est active, ou jusqu'à la résiliation du compte principal.</li>
      <li><strong>Données de compte après résiliation :</strong> Après la résiliation du compte, les données personnelles sont conservées pendant 30 jours, puis automatiquement supprimées.</li>
    </ul>

    <h2>7. Vos droits et coordonnées</h2>
    <p>Vous disposez à tout moment d'un droit d'accès, de rectification, de portabilité et de suppression de vos données personnelles. De plus, vous pouvez retirer votre consentement aux notifications push ou aux services de localisation de manière indépendante et à tout moment via les paramètres de votre navigateur ou de votre appareil mobile.</p>
    <p>Pour toute question ou pour exercer vos droits, veuillez nous contacter à : <a href="mailto:privacy@viacust.com">privacy@viacust.com</a>.</p>
    <p><strong>ViaCust</strong><br />Ruwenbergstraat 52<br />5271AG Sint-Michielsgestel<br />Pays-Bas</p>
  </>
);

export default Privacy;
