import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs: { q: string; a: string }[] = [
  {
    q: "Hoe werkt de betaling en facturatie?",
    a: "ViaCust automatiseert het volledige facturatieproces. Zodra een rit door de begeleider als voltooid is gemarkeerd, genereert het platform namens de begeleider een factuur voor de opdrachtgever. Facturen worden iedere maandag automatisch aangemaakt en per e-mail verstuurd, zodat alle ritten van de afgelopen week in één overzichtelijke factuur worden gebundeld. De betaling verloopt veilig via Stripe. Begeleiders hoeven dus niet zelf facturen te sturen; ViaCust regelt de administratieve afhandeling en zorgt voor een overzichtelijke uitbetaling.",
  },
  {
    q: "Waarom zijn mijn facturen nog niet gegenereerd?",
    a: "ViaCust automatiseert de facturatie (self-billing) om u administratief werk uit handen te nemen. Omdat de brandstoftoeslag in de transportsector wekelijks fluctueert, baseren wij onze berekeningen op de officiële cijfers.\n\nDe facturen van de ritten van afgelopen week worden definitief opgemaakt zodra de officiële gemiddelde dieselprijs van die week door TLN (Transport en Logistiek Nederland) is gepubliceerd. Zodra deze actuele prijs aan het begin van de nieuwe week in ons systeem is verwerkt, worden de facturen direct automatisch gegenereerd en klaargezet in uw dashboard. U ontvangt hier dan ook meteen een melding van.",
  },
  {
    q: "Word ik als begeleider live gevolgd via GPS?",
    a: "Nee. Privacy en vertrouwen staan bij ons voorop. ViaCust verzamelt geen live GPS-locaties en volgt je niet tijdens je werkzaamheden of rusttijden. De app wordt uitsluitend gebruikt voor het matchen van ritten, het doorgeven van ritdetails en de administratieve afronding achteraf. Je behoudt zelf de volledige controle.",
  },
  {
    q: "Kan ik zelf bepalen met wie ik samenwerk?",
    a: "Absoluut. ViaCust faciliteert de contractvrijheid van zowel de opdrachtgever als de zelfstandige begeleider. Begeleiders kunnen voorkeurslijsten aanmaken om aan te geven voor welke opdrachtgevers zij graag rijden. Opdrachtgevers kunnen op basis van eerdere ervaringen een eigen poule van voorkeursbegeleiders beheren. Zo bouwt u altijd aan een betrouwbaar netwerk.",
  },
  {
    q: "Hoe worden de brandstoftoeslagen berekend?",
    a: "Het platform berekent automatisch de geldende brandstoftoeslag op basis van de ritgegevens en de actuele brandstofprijzen (indien geactiveerd). De begeleider voert bij het afsluiten van de rit de gemaakte onkosten in, waarna het systeem deze direct verwerkt in de eindfactuur naar de opdrachtgever. Dit voorkomt rekenfouten en discussies achteraf.",
  },
  {
    q: "Wat zijn de kosten voor het gebruik van ViaCust?",
    a: "Het aanmaken van een account is voor zowel opdrachtgevers als begeleiders volledig gratis. ViaCust rekent pas een servicefee op het moment dat er een succesvolle match en betaling heeft plaatsgevonden. Hierdoor betaalt u alleen voor het daadwerkelijke gebruik van het platform en de administratieve automatisering.",
  },
  {
    q: "Werkt ViaCust ook in het buitenland (bijv. Duitsland)?",
    a: "Ja, ViaCust is ontworpen voor grensoverschrijdende transportbegeleiding. Het platform houdt rekening met internationale btw-regels (zoals de verleggingsregeling binnen de EU) en ondersteunt ritten die starten of eindigen in het buitenland. De documentatie en facturatie worden automatisch aangepast aan de relevante wet- en regelgeving van het betreffende land.",
  },
  {
    q: "Wat gebeurt er als een transport niet doorgaat (annulering)?",
    a: "Indien een rit wordt geannuleerd, hanteren wij de annuleringsvoorwaarden zoals vastgelegd in onze Algemene Voorwaarden. Afhankelijk van het tijdstip van annulering kan er een vergoeding voor de begeleider worden gereserveerd. Alle annuleringen worden digitaal vastgelegd om eventuele discussies over onkosten of gereserveerde tijd transparant op te lossen.",
  },
  {
    q: "Hoe waarborgt ViaCust de kwaliteit van de begeleiders?",
    a: "Kwaliteit is de hoeksteen van ons platform. Begeleiders moeten bij registratie hun relevante bedrijfsgegevens en certificaten (zoals KvK en btw-nummer) overleggen. Daarnaast maakt ViaCust gebruik van een wederzijds beoordelingssysteem en persoonlijke voorkeurslijsten. Dit zorgt ervoor dat alleen professionele en betrouwbare partijen actief blijven op het platform.",
  },
  {
    q: "Hoe zit het met verzekeringen tijdens een rit?",
    a: "ViaCust is een bemiddelingsplatform en is zelf niet de uitvoerende partij. Zelfstandige begeleiders zijn te allen tijde zelf verantwoordelijk voor het hebben van de juiste bedrijfs- en beroepsaansprakelijkheidsverzekeringen en eventuele wettelijk verplichte papieren voor transportbegeleiding. Wij adviseren opdrachtgevers om bij de eerste samenwerking de benodigde documentatie van de begeleider te verifiëren via het platform-profiel.",
  },
  {
    q: "Wat als ik een technisch probleem heb tijdens een aanvraag?",
    a: "Ons platform is gebouwd op robuuste technologie, maar mocht er toch iets niet lukken (bijvoorbeeld bij het uploaden van een document of het accepteren van een rit), dan staat onze support klaar. U kunt ons bereiken via support@viacust.com. Voor urgente zaken tijdens actieve ritten raden wij aan om direct contact op te nemen met de contactpersoon van de opdrachtgever of begeleider die vermeld staat in de ritdetails.",
  },
];

const Faq = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              ViaCust — Veelgestelde vragen
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              Veelgestelde Vragen
            </h1>
            <p className="text-brass-gold/70 text-sm tracking-wide italic mb-6">
              {" "}
            </p>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              Antwoorden op de meest gestelde vragen over werking, facturatie, privacy en kwaliteit van ons platform.
            </p>
          </div>
        </section>

        <section className="py-14 md:py-20 px-5 md:px-8">
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b border-brass-deep/15"
                >
                  <AccordionTrigger className="text-left font-display text-lg md:text-xl text-brass-deep italic hover:text-brass-gold py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-brass-deep/80 leading-relaxed text-base pb-6 whitespace-pre-line">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Faq;
