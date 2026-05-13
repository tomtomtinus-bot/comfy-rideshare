import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";

const Step = ({ n, title, body }: { n: number; title: string; body: string }) => (
  <div className="border-l-2 border-brass-gold pl-6 py-2">
    <div className="text-brass-gold uppercase tracking-[0.25em] text-xs font-semibold mb-2">
      Stap {n}
    </div>
    <h3 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-3">{title}</h3>
    <p className="text-brass-deep/80 leading-relaxed">{body}</p>
  </div>
);

const HoeWerktViaCust = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        {/* Hero */}
        <section className="pt-12 md:pt-20 pb-10 md:pb-16 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-6">
              ViaCust — Transportbegeleiding
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-brass-deep leading-[1] italic mb-8">
              Hoe werkt ViaCust?
            </h1>
            <p className="text-brass-gold/70 text-sm tracking-wide italic mb-6">
              Digital Escort Solutions.
            </p>
            <p className="text-base md:text-lg text-brass-deep/80 leading-relaxed max-w-3xl">
              Efficiëntie in transportbegeleiding begint hier. Of u nu een rit wilt uitzetten of als
              professional op de weg zit: ViaCust brengt vraag en aanbod samen met slimme technologie.
            </p>
          </div>
        </section>

        {/* Voor de Opdrachtgever */}
        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              Voor de Opdrachtgever
            </p>
            <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-10">
              In 3 stappen naar een zorgeloze ritbegeleiding.
            </h2>
            <div className="space-y-8">
              <Step
                n={1}
                title="Plaats uw aanvraag"
                body="Maak eenvoudig een account aan en voer de details van uw transport in: startlocatie, bestemming, gewenste tijden en begeleiderseisen. Uw aanvraag wordt direct zichtbaar voor ons netwerk van geverifieerde begeleiders."
              />
              <Step
                n={2}
                title="Match met een professional"
                body="Begeleiders die beschikbaar zijn en aan uw eisen voldoen, kunnen de rit accepteren. U ontvangt direct een bevestiging met de gegevens van de toegewezen begeleider. Geen eindeloze telefoontjes meer, maar direct resultaat."
              />
              <Step
                n={3}
                title="Voltooiing en overzicht"
                body="Na afloop van de rit wordt alles digitaal afgehandeld. U vindt alle voltooide ritten terug in uw persoonlijke dashboard voor een overzichtelijke administratie."
              />
            </div>
          </div>
        </section>

        {/* Voor de Begeleider */}
        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10 bg-brass-deep text-parchment">
          <div className="max-w-4xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              Voor de Begeleider
            </p>
            <h2 className="font-display text-3xl md:text-5xl italic leading-tight mb-10">
              Uw planning op de automatische piloot.
            </h2>
            <div className="space-y-8">
              {[
                {
                  n: 1,
                  title: "Koppel uw agenda",
                  body: "Meld u aan en koppel uw Google Agenda met één klik. ViaCust leest uw beschikbaarheid. Bent u privé bezet? Dan ontvangt u op die tijden geen ritaanvragen. Zo voorkomt u dubbele boekingen zonder dat u er iets voor hoeft te doen.",
                },
                {
                  n: 2,
                  title: "Ontvang en accepteer ritten",
                  body: "Zodra er een relevante rit wordt geplaatst, ontvangt u direct een melding. Bekijk de details en accepteer de rit die in uw schema past. De rit wordt direct in uw Google Agenda geplaatst, inclusief alle locaties en instructies.",
                },
                {
                  n: 3,
                  title: "Focus op de weg",
                  body: "U bent klaar om te gaan. Alle informatie die u nodig heeft, heeft u bij de hand. ViaCust regelt de rest van de communicatie met de opdrachtgever, zodat u zich kunt concentreren op een veilige begeleiding.",
                },
              ].map((s) => (
                <div key={s.n} className="border-l-2 border-brass-gold pl-6 py-2">
                  <div className="text-brass-gold uppercase tracking-[0.25em] text-xs font-semibold mb-2">
                    Stap {s.n}
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl italic mb-3">{s.title}</h3>
                  <p className="text-parchment/80 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Waarom kiezen */}
        <section className="py-14 md:py-20 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-5xl text-brass-deep italic leading-tight mb-10">
              Waarom kiezen voor ViaCust?
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                ["Geen handmatige planning", "Dankzij de diepe Google Agenda-integratie is uw administratie altijd up-to-date."],
                ["Betrouwbaar netwerk", "Elke gebruiker wordt handmatig gecontroleerd door onze beheerders."],
                ["Transparante kosten", "Een vast laag maandbedrag en een minimale commissie per rit."],
                ["Grenzeloos", "Volledig ondersteund in het Nederlands, Engels, Duits en Frans voor internationaal transport."],
              ].map(([title, body]) => (
                <div key={title} className="p-6 border border-brass-deep/15 bg-parchment/40">
                  <h3 className="font-display text-xl text-brass-deep italic mb-2">{title}</h3>
                  <p className="text-brass-deep/80 leading-relaxed text-sm">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-3">
              <Link
                to="/auth?role=begeleider"
                className="inline-block px-7 py-4 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors text-center"
              >
                Meld aan als begeleider
              </Link>
              <Link
                to="/auth?role=opdrachtgever"
                className="inline-block px-7 py-4 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:border-brass-gold hover:text-brass-gold transition-colors text-center"
              >
                Meld aan als opdrachtgever
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HoeWerktViaCust;
