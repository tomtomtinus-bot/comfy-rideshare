import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`border border-brass-deep/20 bg-brass-deep text-parchment px-3 py-2 text-left text-xs uppercase tracking-widest font-semibold ${className}`}>
    {children}
  </th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`border border-brass-deep/15 px-3 py-2 text-sm text-brass-deep/90 align-top ${className}`}>{children}</td>
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
              Rijtijden &amp; begeleiding exceptioneel transport
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              Officiële rijtijden en het aantal vereiste begeleidingsvoertuigen voor exceptioneel
              transport in Nederland — zowel op het autosnelwegennet als het onderliggend wegennet.
            </p>
            <div className="mt-6">
              <Link to="/info/belgie" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                → Bekijk de Belgische infopagina
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-14">

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                Rijtijden &amp; begeleiding — Autosnelweg
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">
                Inclusief N2, N3, N7, N15 en N57 (Rotterdam – Brielle).
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Categorie</Th>
                      <Th>1 begeleidingsvoertuig</Th>
                      <Th>2 begeleidingsvoertuigen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>Lengte</strong></Td>
                      <Td>40 m – 50 m<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>&gt; 50 m<br/><span className="text-brass-deep/60">20:00 – 06:00</span></Td>
                    </tr>
                    <tr>
                      <Td><strong>Breedte</strong></Td>
                      <Td>4,01 m – 4,50 m<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>
                        4,51 m – 5,00 m<br/><span className="text-brass-deep/60">20:00 – 06:00</span><br/><br/>
                        &gt; 5,00 m<br/><span className="text-brass-deep/60">22:00 – 06:00</span>
                      </Td>
                    </tr>
                    <tr>
                      <Td><strong>Bijzondere verrichting</strong></Td>
                      <Td>—</Td>
                      <Td>10:00 – 15:00 &amp; 20:00 – 06:00</Td>
                    </tr>
                    <tr>
                      <Td><strong>Massa</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 100.000 kg<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                Rijtijden &amp; begeleiding — Onderliggend wegennet
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">
                Inclusief N-wegen onder beheer van RWS en alle wegen onder beheer van provincies,
                gemeenten en waterschappen.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Categorie</Th>
                      <Th>1 begeleidingsvoertuig</Th>
                      <Th>2 begeleidingsvoertuigen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>Lengte</strong></Td>
                      <Td>27,51 m – 32 m<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>&gt; 32,01 m<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00 **</span></Td>
                    </tr>
                    <tr>
                      <Td><strong>Breedte</strong></Td>
                      <Td>3,51 m – 4 m<br/><span className="text-brass-deep/60">geen beperking</span></Td>
                      <Td>
                        4,01 m – 4,99 m<br/>
                        <span className="text-brass-deep/60">10:00 – 15:00 (tot 4,51 m)</span><br/>
                        <span className="text-brass-deep/60">20:00 – 06:00</span><br/><br/>
                        &gt; 5,00 m<br/><span className="text-brass-deep/60">22:00 – 06:00</span>
                      </Td>
                    </tr>
                    <tr>
                      <Td><strong>Bijzondere verrichting</strong></Td>
                      <Td>—</Td>
                      <Td>10:00 – 15:00 &amp; 20:00 – 06:00</Td>
                    </tr>
                    <tr>
                      <Td><strong>Massa</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 100.000 kg<br/><span className="text-brass-deep/60">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-1 text-xs text-brass-deep/70 italic leading-relaxed">
                <p>Van bovenstaande rijtijden mag uitsluitend worden afgeweken indien de wegbeheerder de afwijkende rijtijden motiveert.</p>
                <p>* Rijtijden gelden op werkdagen. Op zaterdag en zondag gelden geen rijtijden, tenzij anders voorgeschreven door de wegbeheerder.</p>
                <p>** Bij een transportlengte &gt; 50 m mag een wegbeheerder van het onderliggend wegennet zonder motivatie afwijkende rijtijden opgeven. De lengte is dan voldoende motivatie.</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                Konvooi Nederland
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">
                Niet toegestaan op het onderliggend wegennet. Een konvooi mag maximaal uit
                2 exceptionele voertuigen bestaan.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>1 begeleidingsvoertuig</Th>
                      <Th>2 begeleidingsvoertuigen</Th>
                      <Th>3 begeleidingsvoertuigen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>Afhankelijk van breedte / gewicht is rijden met 1 begeleider mogelijk.</Td>
                      <Td>Tot 50 m</Td>
                      <Td>50,01 m – 120 m</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default InfoNederland;
