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

const InfoNederland = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-8 md:pb-12 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-5xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              Info — Nederland
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[1.05] mb-4">
              Rij­tijden &amp; afmetingen exceptioneel transport
            </h1>
            <p className="text-brass-gold/70 text-sm tracking-wide italic mb-4">
              ViaCust, Digital Escort Solutions.
            </p>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              Overzicht van de toegestane afmetingen en rijtijden voor exceptioneel transport over
              het Nederlandse onderliggende en bovenliggende wegennet.
            </p>
            <div className="mt-6">
              <Link to="/info/belgie" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                → Bekijk de Belgische info­pagina
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-12">
            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Onderliggend wegennet
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr><Th>Lengte (m)</Th><Th>Breedte (m)</Th><Th>Massa (t)</Th></tr>
                  </thead>
                  <tbody>
                    <tr><Td>22m00 – 27m50</Td><Td>3m00 – 3m50</Td><Td>—</Td></tr>
                    <tr><Td>27m51 – 32m00</Td><Td>3m51 – 4m00</Td><Td>—</Td></tr>
                    <tr><Td>32m01 – 50m00</Td><Td>4m01 – 4m50</Td><Td>—</Td></tr>
                    <tr><Td>&gt; 50m01</Td><Td>&gt; 5m01</Td><Td>&gt; 100t</Td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Bovenliggend wegennet
              </h2>
              <p className="text-sm text-brass-deep/70 mb-3 italic">
                Autosnelwegen inclusief N2, N3, N7, N15 en N57 (Rotterdam-Brielle).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr><Th>Lengte (m)</Th><Th>Breedte (m)</Th><Th>Massa (t)</Th></tr>
                  </thead>
                  <tbody>
                    <tr><Td>22m00 – 40m00</Td><Td>3m00 – 4m00</Td><Td>—</Td></tr>
                    <tr><Td>40m01 – 50m00</Td><Td>4m01 – 4m50</Td><Td>—</Td></tr>
                    <tr><Td>—</Td><Td>4m51 – 5m00</Td><Td>—</Td></tr>
                    <tr><Td>&gt; 50m01</Td><Td>&gt; 5m01</Td><Td>&gt; 100t</Td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Rijtijden onderliggend wegennet
              </h2>
              <ul className="space-y-2 text-sm text-brass-deep/90 leading-relaxed list-disc pl-5">
                <li>Breedte 4m01 – 4m50: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Breedte 4m51 – 5m00: van 20h00 en 06h00</li>
                <li>Breedte 5m01 en breder: 22h00 – 06h00</li>
                <li>Lengte 40m01 – 50m00: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Lengte 40m01 en langer: van 20h00 en 06h00</li>
                <li>Gewicht: vanaf 100.001 kg en zwaarder: van 10h00 – 15h00 en 20h00 en 06h00</li>
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                Rijtijden bovenliggend wegennet
              </h2>
              <ul className="space-y-2 text-sm text-brass-deep/90 leading-relaxed list-disc pl-5">
                <li>Breedte 3m51 – 4m00: geen beperkingen</li>
                <li>Breedte 4m01 – 4m50: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Breedte 4m51 – 5m00: 20h00 – 06h00</li>
                <li>Breedte 5m00 en breder: 22h00 – 06h00</li>
                <li>Lengte 27m51 – 32m00: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Lengte 32m01 – 50m00: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Lengte 50m01 en langer: van 10h00 – 15h00 en 20h00 en 06h00</li>
                <li>Gewicht: vanaf 100.001 kg en zwaarder: van 10h00 – 15h00 en 20h00 en 06h00</li>
              </ul>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InfoNederland;
