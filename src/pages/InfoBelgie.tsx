import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="border border-brass-deep/20 bg-brass-deep text-parchment px-3 py-2 text-left text-xs uppercase tracking-widest font-semibold">
    {children}
  </th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="border border-brass-deep/15 px-3 py-2 text-sm text-brass-deep/90">{children}</td>
);

const links = [
  { label: "Netwerk autosnelwegen", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/netwerk-autosnelwegen" },
  { label: "Netwerk klasse 90", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/netwerk-klasse-90" },
  { label: "Netwerk klasse 120", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/netwerk-klasse-120" },
  { label: "Netwerk kranen", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/netwerk-kranen" },
  { label: "5 km/u op autosnelwegen", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/5-kmu-op-autosnelwegen" },
  { label: "Actuele en belangrijke wegenwerken in België", href: "https://wegenenverkeer.be/wegenwerken" },
  { label: "Plan uw route via het reiswegennetwerk op kaart (Vlaams Gewest)", href: "https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer/reiswegennetwerk" },
  { label: "Plan uw route via het reiswegennetwerk op kaart (Waals Gewest)", href: "https://routier.wallonie.be/" },
];

const InfoBelgie = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-8 md:pb-12 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-5xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              Info — België
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[1.05] mb-4">
              Uitzonderlijk vervoer in België
            </h1>
            <p className="text-brass-gold/70 text-sm tracking-wide italic mb-4">
              {" "}
            </p>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              Praktische schema&apos;s voor afmetingen en de officiële netwerken (autosnelwegen,
              klasse 90, klasse 120, kranen) van Wegen en Verkeer Vlaanderen, met directe links
              naar het reiswegennetwerk in Vlaanderen en Wallonië.
            </p>
            <div className="mt-6">
              <Link to="/info/nederland" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                → Bekijk de Nederlandse info­pagina
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-12">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-6">
                Belgische netwerken &amp; route­planning
              </h2>
              <ul className="grid sm:grid-cols-2 gap-3">
                {links.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-brass-deep/15 hover:border-brass-gold hover:bg-brass-gold/5 transition-colors"
                    >
                      <span className="text-sm text-brass-deep font-semibold">{l.label}</span>
                      <span className="block text-xs text-brass-deep/60 mt-1 truncate">{l.href}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-brass-deep/10 pt-8">
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Officiële bronnen
              </h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer" target="_blank" rel="noopener noreferrer" className="text-brass-gold hover:underline">
                    Agentschap Wegen en Verkeer — Zwaar en uitzonderlijk vervoer
                  </a>
                </li>
                <li>
                  <a href="https://mobilit.belgium.be/nl/wegverkeer/uitzonderlijk-vervoer" target="_blank" rel="noopener noreferrer" className="text-brass-gold hover:underline">
                    FOD Mobiliteit — Uitzonderlijk vervoer
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InfoBelgie;
