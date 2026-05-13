import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";

const Section = ({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
    <div className="max-w-4xl mx-auto">
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
        {kicker}
      </p>
      <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-8">
        {title}
      </h2>
      <div className="space-y-5 text-brass-deep/80 leading-relaxed text-base md:text-lg">
        {children}
      </div>
    </div>
  </section>
);

const Bullet = ({ label, value }: { label: string; value: string }) => (
  <div className="border-l-2 border-brass-gold pl-5 py-1">
    <span className="font-semibold text-brass-deep">{label}: </span>
    <span>{value}</span>
  </div>
);

const WatKostViaCust = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        {/* Hero */}
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              ViaCust — Tarieven
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              Wat kost ViaCust?
            </h1>
            <p className="text-brass-gold/70 text-sm tracking-wide italic mb-6">
              ViaCust Digital Escort Solutions.
            </p>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              Bij ViaCust kiest u voor volledige ontzorging en een professionele administratieve
              afhandeling. Wij hanteren een transparante prijsstructuur zonder verborgen kosten,
              gericht op een duurzame samenwerking tussen opdrachtgevers en begeleiders.
            </p>
          </div>
        </section>

        {/* Opdrachtgever */}
        <Section
          kicker="Voor de Opdrachtgever (Transportonderneming)"
          title="Stroomlijn uw planning en administratie met één centraal systeem."
        >
          <Bullet label="Vaste bijdrage" value="€ 25,- per maand." />
          <Bullet label="Platformcommissie" value="Slechts 1,5% per voltooide rit." />
          <p>
            <span className="font-semibold text-brass-deep">Uw voordeel: </span>U ontvangt per
            begeleider een overzichtelijke wekelijkse verzamelfactuur. Geen losse stroom aan
            facturen meer, maar één helder overzicht voor uw boekhouding.
          </p>
        </Section>

        {/* Begeleider */}
        <Section
          kicker="Voor de Begeleider (Professional)"
          title="Focus op de weg, terwijl ons systeem uw backoffice beheert."
        >
          <Bullet label="Vaste bijdrage" value="€ 2,50 per maand." />
          <Bullet
            label="Onbeperkt ritten"
            value="Er is geen limiet aan het aantal opdrachten dat u kunt accepteren."
          />
          <Bullet
            label="Google Agenda Sync"
            value="Uw planning wordt volledig automatisch beheerd."
          />
        </Section>

        {/* Facturatie */}
        <Section
          kicker="Geavanceerde Automatische Facturatie"
          title="Wij nemen de volledige financiële afwikkeling uit uw handen."
        >
          <p>ViaCust gaat verder waar andere platformen stoppen.</p>
          <Bullet
            label="Wekelijkse verzamelfacturen"
            value="Het systeem genereert wekelijks automatisch de facturen. Opdrachtgevers ontvangen per begeleider één verzamelfactuur van alle ritten van die week."
          />
          <Bullet
            label="Brandstoftoeslagen op maat"
            value="U kunt als begeleider uw eigen voorkeuren instellen voor brandstoftoeslagen. Het systeem berekent en verwerkt deze toeslagen automatisch in elke factuur, op basis van de actuele marktwaarden of uw eigen afspraken."
          />
          <Bullet
            label="Extra kosten"
            value="Heeft u tijdens de rit extra kosten gemaakt (zoals tolkosten of onvoorziene uitgaven)? U kunt deze eenvoudig kenbaar maken in de app, waarna ze direct worden meegenomen op de eerstvolgende verzamelfactuur."
          />
        </Section>

        {/* Incasso */}
        <Section
          kicker="Automatische incasso & gemak"
          title="Een volledig geautomatiseerd betaalsysteem."
        >
          <p>
            Om uw administratieve last tot een minimum te beperken, werkt ViaCust met een volledig
            geautomatiseerd betaalsysteem.
          </p>
          <Bullet
            label="Automatische afschrijving"
            value="De maandelijkse vaste kosten en de verzamelde platformcommissie worden automatisch afgeschreven via de door u gekoppelde betaalmethode (incasso of creditcard)."
          />
          <Bullet
            label="Geen handmatige handelingen"
            value="U hoeft geen losse facturen voor het platformgebruik over te boeken; alles wordt wekelijks gespecificeerd en automatisch verrekend."
          />
          <p className="font-display italic text-2xl md:text-3xl text-brass-deep pt-4">
            Efficiëntie, precisie en gemak. Dat is de standaard van ViaCust.
          </p>
        </Section>

        {/* CTA */}
        <section className="py-14 md:py-20 px-5 md:px-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
            <Link
              to="/auth?role=client"
              className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
            >
              Meld aan als opdrachtgever
            </Link>
            <Link
              to="/auth?role=escort"
              className="inline-block px-7 py-4 border-2 border-brass-deep text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-brass-deep hover:text-parchment transition-colors text-center"
            >
              Meld aan als begeleider
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WatKostViaCust;
