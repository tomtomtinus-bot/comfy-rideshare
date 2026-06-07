import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`border border-brass-deep/20 bg-brass-deep text-parchment px-3 py-2 text-left text-xs uppercase tracking-widest font-semibold ${className}`}>
    {children}
  </th>
);
const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`border border-brass-deep/15 px-3 py-2 text-sm text-brass-deep/90 align-top ${className}`}>{children}</td>
);

const InfoNederland = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-8 md:pb-12 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-5xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              {t("infoNL.kicker")}
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[1.05] mb-4">
              {t("infoNL.title")}
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              {t("infoNL.intro")}
            </p>
            <div className="mt-6">
              <Link to="/info/belgie" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                {t("infoCommon.viewBE")}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-14">

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                {t("infoNL.highwayTitle")}
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">{t("infoNL.highwayHint")}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>{t("infoCommon.category")}</Th>
                      <Th>{t("infoCommon.oneEscortVehicle")}</Th>
                      <Th>{t("infoCommon.twoEscortVehicles")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>{t("infoCommon.length")}</strong></Td>
                      <Td>40 m – 50 m<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>&gt; 50 m<br/><span className="text-brass-deep/80">20:00 – 06:00</span></Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.width")}</strong></Td>
                      <Td>4,01 m – 4,50 m<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>
                        4,51 m – 5,00 m<br/><span className="text-brass-deep/80">20:00 – 06:00</span><br/><br/>
                        &gt; 5,00 m<br/><span className="text-brass-deep/80">22:00 – 06:00</span>
                      </Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.specialMove")}</strong></Td>
                      <Td>—</Td>
                      <Td>10:00 – 15:00 &amp; 20:00 – 06:00</Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.mass")}</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 100.000 kg<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                {t("infoNL.secondaryTitle")}
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">{t("infoNL.secondaryHint")}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>{t("infoCommon.category")}</Th>
                      <Th>{t("infoCommon.oneEscortVehicle")}</Th>
                      <Th>{t("infoCommon.twoEscortVehicles")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>{t("infoCommon.length")}</strong></Td>
                      <Td>27,51 m – 32 m<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                      <Td>&gt; 32,01 m<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00 **</span></Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.width")}</strong></Td>
                      <Td>3,51 m – 4 m<br/><span className="text-brass-deep/80">{t("infoNL.noBeperking")}</span></Td>
                      <Td>
                        4,01 m – 4,99 m<br/>
                        <span className="text-brass-deep/80">10:00 – 15:00 (tot 4,51 m)</span><br/>
                        <span className="text-brass-deep/80">20:00 – 06:00</span><br/><br/>
                        &gt; 5,00 m<br/><span className="text-brass-deep/80">22:00 – 06:00</span>
                      </Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.specialMove")}</strong></Td>
                      <Td>—</Td>
                      <Td>10:00 – 15:00 &amp; 20:00 – 06:00</Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.mass")}</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 100.000 kg<br/><span className="text-brass-deep/80">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-1 text-xs text-brass-deep/70 italic leading-relaxed">
                <p>{t("infoNL.note1")}</p>
                <p>{t("infoNL.note2")}</p>
                <p>{t("infoNL.note3")}</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-2">
                {t("infoNL.convoyTitle")}
              </h2>
              <p className="text-sm text-brass-deep/70 mb-4 italic">{t("infoNL.convoyHint")}</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>{t("infoCommon.oneEscortVehicle")}</Th>
                      <Th>{t("infoCommon.twoEscortVehicles")}</Th>
                      <Th>{t("infoCommon.threeEscortVehicles")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>{t("infoNL.convoyOne")}</Td>
                      <Td>{t("infoNL.convoyTwo")}</Td>
                      <Td>{t("infoNL.convoyThree")}</Td>
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
