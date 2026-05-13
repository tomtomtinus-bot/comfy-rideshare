import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

type Lang = "nl" | "en" | "de" | "fr";

const labels: Record<Lang, { kicker: string; title: string; updated: string; back: string }> = {
  nl: { kicker: "Juridisch", title: "Algemene Voorwaarden ViaCust", updated: "Versie 1.4 — Laatst bijgewerkt op: 13 mei 2026", back: "← Terug" },
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
    <h2>1. De Dienst</h2>
    <p>ViaCust biedt een digitaal SaaS-platform dat transportbegeleiders en opdrachtgevers samenbrengt. ViaCust fungeert uitsluitend als bemiddelaar en is geen partij bij de uiteindelijke transportovereenkomst tussen gebruiker en opdrachtgever.</p>

    <h2>2. Gebruik van het Platform</h2>
    <p><strong>Account:</strong> Gebruikers zijn verantwoordelijk voor het geheimhouden van hun inloggegevens (waaronder Google-accounttoegang).</p>
    <p><strong>Abonnement:</strong> Voor gebruik van het platform kan een jaarlijkse fee worden gevraagd. Introductiekortingen (bijv. 50% in het eerste jaar) zijn eenmalig en vervallen bij verlenging, tenzij anders aangegeven.</p>

    <h2>3. Facturatie en Lastgeving (Self-Billing)</h2>
    <p>Begeleiders verlenen ViaCust bij acceptatie van deze voorwaarden een onherroepelijke lastgeving/volmacht om namens de begeleider facturen op te stellen en te versturen naar de opdrachtgever voor uitgevoerde ritten. De begeleider blijft zelf verantwoordelijk voor de fiscale juistheid van de verstrekte gegevens (zoals BTW-nummer en onkosten).</p>

    <h2>4. Voorkeurslijsten en Kwaliteit</h2>
    <p>Opdrachtgevers en begeleiders hebben de vrijheid om eigen voorkeurslijsten te beheren. ViaCust behoudt zich het recht voor om accounts te schorsen bij herhaaldelijke negatieve beoordelingen, wangedrag of het niet nakomen van afspraken, na hoor en wederhoor.</p>

    <h2>5. Aansprakelijkheid en Verzekering</h2>
    <ul>
      <li>ViaCust is niet aansprakelijk voor schade die voortvloeit uit de uitvoering van de transportbegeleiding.</li>
      <li>Begeleiders dienen zelf zorg te dragen voor afdoende bedrijfs- en beroepsaansprakelijkheidsverzekeringen.</li>
      <li>ViaCust is niet aansprakelijk voor fouten in routeberekeningen of technische storingen van derden (zoals Google Maps of Stripe).</li>
    </ul>

    <h2>6. Annuleringen</h2>
    <p>Indien een geaccepteerde rit door de opdrachtgever wordt geannuleerd, gelden de op het platform gecommuniceerde annuleringstermijnen en vergoedingen.</p>

    <h2>7. Toepasselijk recht</h2>
    <p>Op deze voorwaarden is het Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in het arrondissement waar ViaCust is gevestigd.</p>
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
