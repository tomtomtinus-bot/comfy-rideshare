import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="border border-brass-deep/20 bg-brass-deep text-parchment px-3 py-2 text-left text-xs uppercase tracking-widest font-semibold">
    {children}
  </th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="border border-brass-deep/15 px-3 py-2 text-sm text-brass-deep/90 align-top">{children}</td>
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
              Voorschriften uitzonderlijk vervoer België
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              Officiële voorschriften voor transportbegeleiding en de geldende rijverboden voor
              uitzonderlijk vervoer in België, inclusief directe links naar de netwerken en
              reiswegen­planning van Wegen en Verkeer.
            </p>
            <div className="mt-6">
              <Link to="/info/nederland" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                → Bekijk de Nederlandse infopagina
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-14">

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Voorschriften transportbegeleiding
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Aantal begeleiders</Th>
                      <Th>1 begeleidingsvoertuig</Th>
                      <Th>2 begeleidingsvoertuigen</Th>
                      <Th>3 begeleidingsvoertuigen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>Lengte</strong></Td>
                      <Td>&gt; 30 m en ≤ 35 m</Td>
                      <Td>&gt; 35 m en ≤ 40 m</Td>
                      <Td>&gt; 40 m</Td>
                    </tr>
                    <tr>
                      <Td><strong>Breedte</strong></Td>
                      <Td>&gt; 3,5 m en ≤ 4,5 m</Td>
                      <Td>&gt; 4,5 m en ≤ 5 m</Td>
                      <Td>&gt; 5 m</Td>
                    </tr>
                    <tr>
                      <Td><strong>Hoogte</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 4,8 m</Td>
                      <Td>—</Td>
                    </tr>
                    <tr>
                      <Td><strong>Massa</strong></Td>
                      <Td>&gt; 90 ton</Td>
                      <Td>&gt; 180 ton</Td>
                      <Td>—</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-brass-deep/80 leading-relaxed">
                <p className="italic mb-2">
                  Indien het uitzonderlijk voertuig één van volgende bewegingen moet uitvoeren,
                  zijn er twee officiële begeleiders vereist:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-brass-deep/80">
                  <li>Wanneer tegenliggend of in de rijrichting rijdend verkeer moet worden gestopt op openbare wegen waar de toegelaten maximumsnelheid niet meer dan 70 km/u bedraagt.</li>
                  <li>Wanneer op kruispunten met verkeerslichten het verkeer moet worden tegengehouden voor de tijd die het konvooi nodig heeft om het kruispunt te verlaten (bij rood licht).</li>
                  <li>Wanneer op kruispunten zonder verkeerslichten het verkeer uit de tegenoverliggende straten moet worden tegengehouden.</li>
                  <li>Om te verhinderen dat het verkeer uit dezelfde richting, rijdend achter het uitzonderlijk transport, dat transport zou voorbijsteken.</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Rijverboden uitzonderlijk vervoer
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Gewone wegen</Th>
                      <Th>Snelwegen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>Zaterdag van 12:00 tot maandag 00:01 *</Td>
                      <Td>Zaterdag van 12:00 tot maandag 00:01 *</Td>
                    </tr>
                    <tr>
                      <Td>Dag vóór een wettelijke feestdag vanaf 16:00 tot de feestdag zelf om 24:00 **</Td>
                      <Td>Dag vóór een wettelijke feestdag vanaf 16:00 tot de feestdag zelf om 24:00 **</Td>
                    </tr>
                    <tr>
                      <Td>Tussen 07:00 – 09:00 en tussen 16:00 – 18:00<br/><span className="text-brass-deep/60">Tenzij massa ≤ 60 t, breedte ≤ 3,50 m en lengte ≤ 27 m ***</span></Td>
                      <Td>Tussen 07:00 – 09:00 en tussen 16:00 – 18:00<br/><span className="text-brass-deep/60">Tenzij ≤ 3,50 m breed of ≤ 27 m lang ***</span></Td>
                    </tr>
                    <tr>
                      <Td>Tussen 06:00 – 21:00 voor alle transporten langer dan 30 m of breder dan 4 m ****</Td>
                      <Td>Tussen 06:00 – 21:00 voor alle transporten langer dan 30 m of breder dan 3,50 m ****</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2 text-xs text-brass-deep/70 italic leading-relaxed">
                <p>* Behalve voor kraanauto&apos;s met massa &lt; 96 ton, of die niet breder zijn dan 3 m.</p>
                <p>** Officiële feestdagen: 1 januari · paasmaandag · 1 mei · O.L.H. Hemelvaart · pinkstermaandag · 21 juli · 15 augustus · 1 en 11 november · 25 december.</p>
                <p>*** Voor zover de vergunning geen voorschriften voorziet die invloed kunnen hebben op de doorstroming van het verkeer (specifieke manoeuvres of beperkte snelheid).</p>
                <p>**** Het verkeer van uitzonderlijke voertuigen tot 4 m breed is op autosnelwegen uitzonderlijk toegelaten van 06:00 – 21:00 in de volgende gevallen:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Netwerk AB: snelwegen met minstens 3 rijstroken in de gevolgde rijrichting, behalve ter hoogte van op- en afritten.</li>
                  <li>Netwerk 90 &amp; 120 T: autosnelwegen met twee rijstroken in de gevolgde rijrichting vermeld in de Netwerk-reiswegen. Niet geldig bij trajectvergunningen.</li>
                </ul>
                <p className="pt-2">Gebaseerd op de huidige wetgeving, onder voorbehoud van wijzigingen.</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-6">
                Belgische netwerken &amp; routeplanning
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
