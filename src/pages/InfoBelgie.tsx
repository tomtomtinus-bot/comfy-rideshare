import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="border-b border-border px-3 py-2 text-left text-xs font-medium text-muted-foreground">
    {children}
  </th>
);
const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="border-b border-border/60 px-3 py-2 text-sm text-foreground/85 align-top">
    {children}
  </td>
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
      <main className="px-5 md:px-8 py-10 md:py-14">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              {t("infoBE.title")}
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              {t("infoBE.intro")}
            </p>
            <div>
              <Button asChild variant="ghost" size="sm" className="px-0 h-auto text-primary hover:bg-transparent">
                <Link to="/info/nederland">{t("infoCommon.viewNL")} →</Link>
              </Button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoBE.prescriptionsTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoBE.twoRequired")}
              </CardContent>
            </Card>
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoBE.bansTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoBE.foot1")}
              </CardContent>
            </Card>
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoBE.networksTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoCommon.officialSources")}
              </CardContent>
            </Card>
          </section>

          <section>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="prescriptions">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoBE.prescriptionsTitle")}
                </AccordionTrigger>
                <AccordionContent>
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
                  <div className="mt-4 text-sm text-foreground/85 leading-relaxed">
                    <p className="mb-2">{t("infoBE.twoRequired")}</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      <li>{t("infoBE.twoBullet1")}</li>
                      <li>{t("infoBE.twoBullet2")}</li>
                      <li>{t("infoBE.twoBullet3")}</li>
                      <li>{t("infoBE.twoBullet4")}</li>
                    </ul>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bans">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoBE.bansTitle")}
                </AccordionTrigger>
                <AccordionContent>
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
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground leading-relaxed">
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
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="networks">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoBE.networksTitle")}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {links.map((l) => (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 border border-input rounded-md hover:border-primary hover:bg-accent/30 transition-colors"
                        >
                          <span className="text-sm font-medium text-foreground">{l.label}</span>
                          <span className="block text-xs text-muted-foreground mt-1 truncate">{l.href}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sources">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoCommon.officialSources")}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="https://wegenenverkeer.be/zwaar-en-uitzonderlijk-vervoer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Agentschap Wegen en Verkeer — Zwaar en uitzonderlijk vervoer
                      </a>
                    </li>
                    <li>
                      <a href="https://mobilit.belgium.be/nl/wegverkeer/uitzonderlijk-vervoer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        FOD Mobiliteit — Uitzonderlijk vervoer
                      </a>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InfoBelgie;
