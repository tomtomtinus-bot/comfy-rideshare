import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string }> = {
  nl: { kicker: "Juridisch", title: "Algemene Voorwaarden & Gebruiksvoorwaarden ViaCust", updated: "Versie 1.2 — Laatst bijgewerkt: 12 mei 2026", back: "← Terug" },
  en: { kicker: "Legal", title: "Terms and Conditions", updated: "Last updated: May 10, 2026", back: "← Back" },
  de: { kicker: "Rechtliches", title: "Allgemeine Geschäftsbedingungen", updated: "Zuletzt aktualisiert: 10. Mai 2026", back: "← Zurück" },
  fr: { kicker: "Mentions légales", title: "Conditions Générales d'Utilisation", updated: "Dernière mise à jour : 10 mai 2026", back: "← Retour" },
};

const Terms = () => {
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
            {lang === "nl" && <TermsNL />}
            {lang === "en" && <TermsEN />}
            {lang === "de" && <TermsDE />}
            {lang === "fr" && <TermsFR />}
          </div>

          <div className="pt-6 border-t border-brass-deep/10 flex justify-between items-center">
            <Link to="/auth" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:text-brass-deep">
              {L.back}
            </Link>
            <Link to="/privacy" className="text-xs uppercase tracking-widest font-semibold text-brass-deep/60 hover:text-brass-gold">
              {lang === "nl" ? "Privacyverklaring" : lang === "de" ? "Datenschutzerklärung" : lang === "fr" ? "Politique de confidentialité" : "Privacy Policy"} →
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

const TermsNL = () => (
  <>
    <h2>1. Toepasselijkheid en Reikwijdte</h2>
    <p>Deze voorwaarden zijn van toepassing op alle diensten geleverd door <strong>ViaCust</strong> binnen de Europese Unie. Door gebruik te maken van het Platform, gaat de Gebruiker (Opdrachtgever dan wel Begeleider) onherroepelijk akkoord met deze voorwaarden en verklaart deze tevens de Privacyverklaring te hebben gelezen en geaccepteerd. Afwijkingen van deze voorwaarden zijn slechts geldig indien deze schriftelijk door ViaCust zijn bevestigd.</p>

    <h2>2. De Rol van ViaCust (SaaS-Platform)</h2>
    <ul>
      <li><strong>Platformfunctie:</strong> ViaCust fungeert uitsluitend als een digitale infrastructuur (Software as a Service) die vraag en aanbod in de transportbegeleiding samenbrengt en administratieve processen automatiseert.</li>
      <li><strong>Geen Bemiddeling:</strong> ViaCust treedt niet op als bemiddelaar, agent of tussenpersoon. De overeenkomst voor de feitelijke transportbegeleiding komt rechtstreeks tot stand tussen de Opdrachtgever en de Begeleider.</li>
      <li><strong>Geen Dienstbetrekking:</strong> Het gebruik van het platform creëert nimmer een arbeidsrelatie tussen ViaCust en de Begeleider. De Begeleider voert de werkzaamheden uit als zelfstandig ondernemer voor eigen rekening en risico.</li>
      <li><strong>Eigenaren en Medewerkers als Gebruikers:</strong> Medewerkers of eigenaren van ViaCust kunnen als gebruiker actief zijn op het platform. Zij zijn hierbij gebonden aan dezelfde regels, plichten en kwaliteitseisen als alle andere gebruikers.</li>
    </ul>

    <h2>3. Google API-integraties, Kaarten en Synchronisatie</h2>
    <ul>
      <li><strong>Google Calendar:</strong> ViaCust faciliteert een koppeling met de Google Calendar API voor planning en conflict-detectie. Hoewel wij streven naar foutloze gegevensuitwisseling, blijft de Gebruiker te allen tijde zelf verantwoordelijk voor de controle van de eigen agenda. ViaCust is niet aansprakelijk voor schade door dubbele boekingen, foutieve synchronisatie of gemiste opdrachten.</li>
      <li><strong>Google Maps & GPS:</strong> Afstanden, routes en locaties worden berekend via Google Maps API. Deze data dient als bindende basis voor de facturatie (zoals kilometer- en brandstoftoeslagen). ViaCust aanvaardt geen aansprakelijkheid voor (technische) onjuistheden in kaartmateriaal, routeberekeningen of GPS-afwijkingen.</li>
    </ul>

    <h2>4. Kwaliteitsbewaking, Beoordelingen en Voorkeurslijsten</h2>
    <ul>
      <li><strong>Beoordelingssysteem:</strong> Gebruikers kunnen elkaar na een rit beoordelen. Feedback dient feitelijk, professioneel en naar waarheid te zijn. ViaCust heeft het recht om reviews te modereren of te verwijderen indien deze in strijd zijn met de goede zeden of de wet.</li>
      <li><strong>Uitsluitingslijsten (Pools):</strong> Opdrachtgevers hebben de mogelijkheid om een private "uitsluitingslijst" bij te houden. Begeleiders op deze lijst zullen geen ritaanvragen van de betreffende Opdrachtgever meer ontvangen. Deze lijst is vertrouwelijk en uitsluitend zichtbaar voor de betreffende Opdrachtgever en het systeembeheer van ViaCust.</li>
      <li><strong>Schorsing bij Wangedrag:</strong> ViaCust behoudt zich het recht voor om een Gebruiker per direct (tijdelijk) te schorsen of het account definitief te beëindigen bij:
        <ul>
          <li>Herhaaldelijke negatieve beoordelingen of klachten over professionaliteit.</li>
          <li>Het niet verschijnen op een geaccepteerde rit ('no-show').</li>
          <li>Wanbetaling door de Opdrachtgever.</li>
          <li>Het verstrekken van onjuiste (bedrijfs)gegevens of vervallen vergunningen.</li>
        </ul>
      </li>
      <li><strong>Uitsluiting Aansprakelijkheid:</strong> ViaCust is nimmer aansprakelijk voor gederfde inkomsten of andere schade die voortvloeit uit een (terechte) schorsing of uitsluiting van het platform.</li>
    </ul>

    <h2>5. Automatische Facturatie, Brandstof en Betaling</h2>
    <ul>
      <li><strong>Lastgeving:</strong> De Begeleider verleent ViaCust een onherroepelijke lastgeving om in naam en voor rekening van de Begeleider wekelijkse verzamelfacturen op te stellen.</li>
      <li><strong>Input-verantwoordelijkheid:</strong> De Begeleider is exclusief verantwoordelijk voor de juistheid van de ingestelde brandstofpercentages, kilometerprijzen en onkosten. ViaCust voert geen inhoudelijke controle uit op deze bedragen.</li>
      <li><strong>Betalingsplicht:</strong> De Opdrachtgever is juridisch verplicht de door ViaCust gegenereerde facturen binnen de gestelde termijn te voldoen aan de Begeleider. ViaCust faciliteert de facturatie, maar is geen incassobureau en draagt geen risico voor oninbare vorderingen.</li>
    </ul>

    <h2>6. Commissie, Abonnement en Btw</h2>
    <ul>
      <li><strong>Inhouding:</strong> De platformcommissie (1,5% per rit) en de maandelijkse abonnementskosten worden automatisch geïncasseerd via Stripe.</li>
      <li><strong>Btw & Reverse Charge:</strong> Alle prijzen op het platform zijn exclusief btw. Voor grensoverschrijdende diensten binnen de EU past ViaCust de verleggingsregeling (Reverse Charge) toe waar wettelijk vereist. Gebruikers zijn zelf verantwoordelijk voor de correcte verwerking van btw in hun eigen boekhouding.</li>
    </ul>

    <h2>7. Verplichtingen en EU-Sancties</h2>
    <ul>
      <li><strong>Vergunningen:</strong> Begeleiders verklaren te beschikken over alle wettelijk vereiste certificaten (zoals vakbekwaamheidsbewijzen) en verzekeringen (WA, beroeps- en bedrijfsaansprakelijkheid).</li>
      <li><strong>Sancties:</strong> Gebruikers verklaren dat zij, noch hun onderneming, voorkomen op EU-sanctielijsten.</li>
    </ul>

    <h2>8. Uitsluiting van Aansprakelijkheid (Algemeen)</h2>
    <ul>
      <li><strong>Uitvoering:</strong> ViaCust is niet aansprakelijk voor schade aan goederen, voertuigen of personen tijdens de uitvoering van een rit.</li>
      <li><strong>Beschikbaarheid:</strong> ViaCust garandeert geen 100% uptime van de website of app. Schade door technische storingen is uitdrukkelijk uitgesloten.</li>
    </ul>

    <h2>9. Herroepingsrecht en Toepasselijk Recht</h2>
    <ul>
      <li><strong>Afstand Herroeping:</strong> Bij het koppelen van API-services of het accepteren van de eerste rit, erkent de Gebruiker dat de uitvoering van de digitale dienst direct begint en vervalt het wettelijke herroepingsrecht.</li>
      <li><strong>Rechtskeuze:</strong> Op deze voorwaarden is uitsluitend het Nederlands recht van toepassing. Geschillen zullen worden voorgelegd aan de bevoegde rechter te 's-Hertogenbosch.</li>
    </ul>
  </>
);

const TermsEN = () => (
  <>
    <h2>1. Applicability and Scope</h2>
    <p>These terms apply to all services provided by <strong>ViaCust</strong> within the European Union. By using the Platform, the User agrees to these terms.</p>

    <h2>2. Services (Intermediation)</h2>
    <ul>
      <li>The Platform functions exclusively as a digital marketplace connecting Clients and Escorts.</li>
      <li>The agreement for the actual transport accompaniment is concluded directly between the Client and the Escort.</li>
      <li><strong>ViaCust</strong> is never a party to this agreement and accepts no liability for the quality, safety, or legality of the services provided.</li>
      <li><strong>Employees and Owners as Users:</strong> Employees or owners of ViaCust may be active as users on the platform. They are bound by the same rules, obligations and quality requirements as all other users.</li>
    </ul>

    <h2>3. Access and EU Sanctions</h2>
    <ul>
      <li>Users declare they are not on any relevant EU sanction lists.</li>
      <li>Escorts declare they comply with all local European regulations regarding transport accompaniment (e.g., EU Regulation No. 1071/2009).</li>
    </ul>

    <h2>4. Right of Withdrawal and Digital Content</h2>
    <p>By agreeing to the start of the service (account approval), the User waives their right of withdrawal as the execution of the digital service begins immediately.</p>

    <h2>5. Payments and VAT (Tax Compliance)</h2>
    <p>All prices are exclusive of VAT. For cross-border services within the EU, the <strong>Reverse Charge</strong> mechanism applies. Users are responsible for correct VAT reporting in their own member state.</p>

    <h2>6. Limitation of Liability</h2>
    <p>Our liability is limited to direct damage and capped at the amount of service fees paid by the user in the three months preceding the incident. We are not liable for indirect or consequential damages, or errors in Google Calendar synchronization.</p>

    <h2>7. Online Dispute Resolution (ODR)</h2>
    <p>In accordance with EU Regulation No. 524/2013, we refer you to the European Commission's ODR platform: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>

    <h2>8. Governing Law</h2>
    <p>Dutch law applies. Disputes shall be submitted to the competent court in the district where <strong>ViaCust</strong> is established.</p>
  </>
);

const TermsDE = () => (
  <>
    <h2>1. Geltungsbereich</h2>
    <p>Diese Bedingungen gelten für alle von <strong>ViaCust</strong> innerhalb der Europäischen Union erbrachten Dienstleistungen. Mit der Nutzung der Plattform erklärt sich der Nutzer mit diesen Bedingungen einverstanden.</p>

    <h2>2. Dienstleistung (Vermittlung)</h2>
    <ul>
      <li>Die Plattform fungiert ausschließlich als digitaler Marktplatz, der Auftraggeber und Begleiter zusammenbringt.</li>
      <li>Der Vertrag über die eigentliche Transportbegleitung kommt direkt zwischen dem Auftraggeber und dem Begleiter zustande.</li>
      <li><strong>ViaCust</strong> ist niemals Vertragspartner dieser Vereinbarung und übernimmt keine Haftung für die Qualität oder Rechtmäßigkeit der erbrachten Dienste.</li>
      <li><strong>Mitarbeiter und Eigentümer als Nutzer:</strong> Mitarbeiter oder Eigentümer von ViaCust können als Nutzer auf der Plattform aktiv sein. Sie sind hierbei an dieselben Regeln, Pflichten und Qualitätsanforderungen gebunden wie alle anderen Nutzer.</li>
    </ul>

    <h2>3. Widerrufsrecht</h2>
    <p>Mit der Zustimmung zum Beginn der Dienstleistung (Kontofreigabe) verzichtet der Nutzer auf sein Widerrufsrecht, da die Ausführung der digitalen Dienstleistung sofort beginnt.</p>

    <h2>4. Zahlungen und MwSt. (Steuerkonformität)</h2>
    <p>Alle Preise verstehen sich zuzüglich MwSt. Bei grenzüberschreitenden Leistungen innerhalb der EU gilt das <strong>Reverse-Charge-Verfahren</strong>. Nutzer sind für die korrekte Umsatzsteuererklärung in ihrem eigenen Mitgliedstaat verantwortlich.</p>

    <h2>5. Haftungsbeschränkung</h2>
    <p>Unsere Haftung ist auf direkte Schäden begrenzt und auf die Höhe der in den drei Monaten vor dem Schadensereignis gezahlten Servicegebühren begrenzt. Wir haften nicht für indirekte Schäden oder Fehler bei der Google-Kalender-Synchronisierung.</p>

    <h2>6. Online-Streitbeilegung</h2>
    <p>Gemäß der EU-Verordnung Nr. 524/2013 verweisen wir auf die Online-Streitbeilegungsplattform der Europäischen Kommission: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>

    <h2>7. Anwendbares Recht</h2>
    <p>Es gilt niederländisches Recht. Gerichtsstand ist der Sitz von ViaCust.</p>
  </>
);

const TermsFR = () => (
  <>
    <h2>1. Applicabilité et Portée</h2>
    <p>Les présentes conditions s'appliquent à tous les services fournis par <strong>ViaCust</strong> au sein de l'Union européenne. En utilisant la Plateforme, l'Utilisateur accepte ces conditions.</p>

    <h2>2. Services (Intermédiation)</h2>
    <ul>
      <li>La Plateforme fonctionne exclusivement comme une place de marché numérique mettant en relation des Clients et des Accompagnateurs.</li>
      <li>Le contrat pour l'accompagnement effectif du transport est conclu directement entre le Client et l'Accompagnateur.</li>
      <li><strong>ViaCust</strong> n'est jamais partie à cet accord et n'accepte aucune responsabilité quant à la qualité ou à la légalité des services fournis.</li>
      <li><strong>Employés et Propriétaires comme Utilisateurs:</strong> Les employés ou propriétaires de ViaCust peuvent être actifs en tant qu'utilisateurs sur la plateforme. Ils sont liés par les mêmes règles, obligations et exigences de qualité que tous les autres utilisateurs.</li>
    </ul>

    <h2>3. Droit de Rétractation</h2>
    <p>En acceptant le début du service (approbation du compte), l'Utilisateur renonce à son droit de rétractation, l'exécution du service numérique commençant immédiatement.</p>

    <h2>4. Paiements et TVA (Conformité Fiscale)</h2>
    <p>Tous les prix s'entendent hors TVA. Pour les services transfrontaliers au sein de l'UE, le mécanisme de l'<strong>autoliquidation (Reverse Charge)</strong> s'applique. Les utilisateurs sont responsables de leur déclaration de TVA dans leur propre État membre.</p>

    <h2>5. Limitation de Responsabilité</h2>
    <p>Notre responsabilité est limitée aux dommages directs et plafonnée au montant des frais de service payés par l'utilisateur au cours des trois mois précédant l'incident. Nous ne sommes pas responsables des dommages indirects ou des erreurs de synchronisation Google Calendar.</p>

    <h2>6. Règlement en Ligne des Litiges (RLL)</h2>
    <p>Conformément au règlement UE n° 524/2013, nous vous renvoyons à la plateforme de RLL de la Commission européenne : <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>

    <h2>7. Droit Applicable</h2>
    <p>Le droit néerlandais est applicable. Les litiges seront soumis au tribunal compétent du district où <strong>ViaCust</strong> est établie.</p>
  </>
);

export default Terms;
