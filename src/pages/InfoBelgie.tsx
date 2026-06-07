import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";

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
  { label: "Vrijstelling rijden op feestdagen (PDF)", href: "https://wegenenverkeer.be/sites/default/files/uploads/documenten/uitzonderlijk%20vervoer/20221220_Afwijking%20rijtijden_%20feestdagen.pdf" },
];

const InfoBelgie = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Wetgeving Uitzonderlijk Vervoer België | ViaCust"
        description="Inzicht in de Belgische regelgeving, gewestelijke vergunningen en begeleidingsregels. ViaCust helpt transporteurs en begeleiders in België naadloos te matchen."
        canonical="https://viacust.com/info/belgie"
      />
      <Nav />
      <main>
        <section className="pt-12 md:pt-20 pb-8 md:pb-12 px-5 md:px-8 border-b border-brass-deep/10 bg-gradient-hero">
          <div className="max-w-5xl mx-auto">
            <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
              {t("infoBE.kicker")}
            </p>
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[1.05] mb-4">
              {t("infoBE.title")}
            </h1>
            <p className="text-base md:text-lg text-brass-deep/80 max-w-3xl leading-relaxed">
              {t("infoBE.intro")}
            </p>
            <div className="mt-6">
              <Link to="/info/nederland" className="text-xs uppercase tracking-widest font-semibold text-brass-gold hover:underline">
                {t("infoCommon.viewNL")}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8 border-b border-brass-deep/10">
          <div className="max-w-5xl mx-auto space-y-14">

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                {t("infoBE.prescriptionsTitle")}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>{t("infoCommon.numEscortsCol")}</Th>
                      <Th>{t("infoCommon.oneEscortVehicle")}</Th>
                      <Th>{t("infoCommon.twoEscortVehicles")}</Th>
                      <Th>{t("infoCommon.threeEscortVehicles")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td><strong>{t("infoCommon.length")}</strong></Td>
                      <Td>&gt; 30 m en ≤ 35 m</Td>
                      <Td>&gt; 35 m en ≤ 40 m</Td>
                      <Td>&gt; 40 m</Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.width")}</strong></Td>
                      <Td>&gt; 3,5 m en ≤ 4,5 m</Td>
                      <Td>&gt; 4,5 m en ≤ 5 m</Td>
                      <Td>&gt; 5 m</Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.height")}</strong></Td>
                      <Td>—</Td>
                      <Td>&gt; 4,8 m</Td>
                      <Td>—</Td>
                    </tr>
                    <tr>
                      <Td><strong>{t("infoCommon.mass")}</strong></Td>
                      <Td>&gt; 90 ton</Td>
                      <Td>&gt; 180 ton</Td>
                      <Td>—</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-brass-deep/80 leading-relaxed">
                <p className="italic mb-2">{t("infoBE.twoRequired")}</p>
                <ul className="list-disc pl-5 space-y-1 text-brass-deep/80">
                  <li>{t("infoBE.twoBullet1")}</li>
                  <li>{t("infoBE.twoBullet2")}</li>
                  <li>{t("infoBE.twoBullet3")}</li>
                  <li>{t("infoBE.twoBullet4")}</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                {t("infoBE.bansTitle")}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>{t("infoBE.regularRoads")}</Th>
                      <Th>{t("infoBE.motorways")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>{t("infoBE.ban1")}</Td>
                      <Td>{t("infoBE.ban1")}</Td>
                    </tr>
                    <tr>
                      <Td>{t("infoBE.ban2")}</Td>
                      <Td>{t("infoBE.ban2")}</Td>
                    </tr>
                    <tr>
                      <Td><span className="whitespace-pre-line">{t("infoBE.ban3Reg")}</span></Td>
                      <Td><span className="whitespace-pre-line">{t("infoBE.ban3Mot")}</span></Td>
                    </tr>
                    <tr>
                      <Td>{t("infoBE.ban4Reg")}</Td>
                      <Td>{t("infoBE.ban4Mot")}</Td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 space-y-2 text-xs text-brass-deep/70 italic leading-relaxed">
                <p>{t("infoBE.foot1")}</p>
                <p>{t("infoBE.foot2")}</p>
                <p>{t("infoBE.foot3")}</p>
                <p>{t("infoBE.foot4Intro")}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t("infoBE.foot4Bullet1")}</li>
                  <li>{t("infoBE.foot4Bullet2")}</li>
                </ul>
                <p className="pt-2">{t("infoBE.basedOn")}</p>
              </div>
            </div>

            <div>
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-6">
                {t("infoBE.networksTitle")}
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
                      <span className="block text-xs text-brass-deep/80 mt-1 truncate">{l.href}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-brass-deep/10 pt-8">
              <h2 className="font-display text-2xl md:text-3xl text-brass-deep italic mb-4">
                {t("infoCommon.officialSources")}
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
