import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-3 text-brass-deep/80 leading-relaxed">
    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brass-gold" />
    <span>{children}</span>
  </li>
);

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="px-5 md:px-8 pt-12 md:pt-20 pb-10 md:pb-16 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              Tarieven
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-tight mb-6">
              Eerlijke tarieven voor een slimme planning
            </h1>
            <p className="text-brass-deep/75 leading-relaxed max-w-2xl text-lg">
              Bij ViaCust geloven we in een model waar iedereen bij wint. Geen verborgen
              kosten, maar een transparante structuur die ons in staat stelt het platform
              continu te verbeteren en uw ritten naadloos te synchroniseren.
            </p>
          </div>
        </section>

        <section className="px-5 md:px-8 py-12 md:py-16 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-px bg-brass-deep/10">
            <div className="bg-card p-8 md:p-10">
              <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
                Voor Opdrachtgevers
              </p>
              <h2 className="font-display text-3xl text-brass-deep italic mb-4">
                Transportbedrijven
              </h2>
              <p className="text-brass-deep/75 leading-relaxed mb-6">
                Krijg toegang tot ons uitgebreide netwerk van professionele begeleiders en
                bespaar uren aan planningstijd.
              </p>
              <ul className="space-y-3 text-sm">
                <Bullet>
                  <strong>Vast maandbedrag:</strong> €[Bedrag] per maand.
                </Bullet>
                <Bullet>Onbeperkt ritten plaatsen.</Bullet>
                <Bullet>Toegang tot geverifieerde begeleiders.</Bullet>
                <Bullet>Dashboard met real-time ritstatus.</Bullet>
                <Bullet>
                  <strong>Platform fee:</strong> slechts 1,5% commissie per voltooide rit.
                </Bullet>
                <Bullet>U betaalt alleen voor succes: geen match betekent geen extra kosten.</Bullet>
              </ul>
            </div>

            <div className="bg-card p-8 md:p-10">
              <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
                Voor Begeleiders
              </p>
              <h2 className="font-display text-3xl text-brass-deep italic mb-4">Escorts</h2>
              <p className="text-brass-deep/75 leading-relaxed mb-6">
                Professionaliseer uw werkdag met de beste tools in de sector.
              </p>
              <ul className="space-y-3 text-sm">
                <Bullet>
                  <strong>Vast maandbedrag:</strong> €[Bedrag] per maand.
                </Bullet>
                <Bullet>
                  Volledige Google Agenda-integratie (nooit meer handmatig plannen).
                </Bullet>
                <Bullet>Directe meldingen van nieuwe ritten in uw regio.</Bullet>
                <Bullet>Beheer uw eigen beschikbaarheid en profiel.</Bullet>
                <Bullet>
                  <strong>Geen verborgen kosten:</strong> u behoudt de volledige ritprijs
                  (minus de standaard platform-afhandeling).
                </Bullet>
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 md:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              FAQ
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-brass-deep italic mb-8">
              Veelgestelde vragen over betalingen
            </h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left text-brass-deep">
                  Hoe werkt de automatische betaling?
                </AccordionTrigger>
                <AccordionContent className="text-brass-deep/75 leading-relaxed">
                  Wij maken gebruik van Stripe, de veiligste betaalprovider ter wereld. Uw
                  maandelijkse abonnement wordt automatisch afgeschreven via automatische
                  incasso of creditcard. Zo heeft u er geen omkijken naar.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left text-brass-deep">
                  Wanneer wordt de 1,5% commissie verrekend?
                </AccordionTrigger>
                <AccordionContent className="text-brass-deep/75 leading-relaxed">
                  Deze wordt automatisch berekend op het moment dat een rit succesvol is
                  gekoppeld en voltooid. Dit wordt overzichtelijk gespecificeerd op uw
                  maandelijkse verzamelfactuur.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left text-brass-deep">
                  Kan ik mijn abonnement maandelijks opzeggen?
                </AccordionTrigger>
                <AccordionContent className="text-brass-deep/75 leading-relaxed">
                  Ja. Wij geloven in de kracht van ons platform. Bent u niet tevreden? Dan
                  kunt u uw abonnement op elk gewenst moment stopzetten via uw
                  accountinstellingen.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
