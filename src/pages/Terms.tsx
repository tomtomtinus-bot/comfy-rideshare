import { Link } from "react-router-dom";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const Terms = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Nav />
    <main className="px-6 md:px-8 py-16 md:py-24">
      <article className="max-w-3xl mx-auto bg-card shadow-etched p-8 md:p-12 space-y-6">
        <header>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Juridisch
          </p>
          <h1 className="font-display text-4xl text-brass-deep italic">
            Algemene voorwaarden
          </h1>
          <p className="text-sm text-brass-deep/55 mt-2">
            Laatst bijgewerkt: nog vast te stellen
          </p>
        </header>

        <div className="bg-brass-gold/10 border-l-2 border-brass-gold p-4 text-sm text-brass-deep/80">
          De definitieve algemene voorwaarden worden nog opgesteld. Onderstaande
          tekst is een tijdelijke placeholder zodat het acceptatieproces tijdens
          registratie alvast werkt.
        </div>

        <section className="space-y-3 text-sm leading-relaxed text-brass-deep/85">
          <h2 className="font-display text-xl text-brass-deep italic">1. Toepasselijkheid</h2>
          <p>
            Deze voorwaarden zijn van toepassing op het gebruik van het platform
            door zowel opdrachtgevers als begeleiders.
          </p>

          <h2 className="font-display text-xl text-brass-deep italic">2. Diensten</h2>
          <p>
            Het platform brengt opdrachtgevers van uitzonderlijk transport in
            contact met gecertificeerde verkeersbegeleiders.
          </p>

          <h2 className="font-display text-xl text-brass-deep italic">3. Annulering</h2>
          <p>
            Bij annulering door de opdrachtgever binnen 4 uur voor aanvang van
            de rit wordt per geaccepteerde begeleider een minimumtarief in
            rekening gebracht.
          </p>

          <h2 className="font-display text-xl text-brass-deep italic">4. Aansprakelijkheid</h2>
          <p>Nader te bepalen.</p>

          <h2 className="font-display text-xl text-brass-deep italic">5. Privacy</h2>
          <p>Nader te bepalen.</p>
        </section>

        <div className="pt-6 border-t border-brass-deep/10">
          <Link
            to="/auth"
            className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:text-brass-deep"
          >
            ← Terug
          </Link>
        </div>
      </article>
    </main>
    <Footer />
  </div>
);

export default Terms;
