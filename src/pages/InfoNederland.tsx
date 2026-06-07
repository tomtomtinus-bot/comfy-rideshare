import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";
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

const InfoNederland = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Regels Transportbegeleiding Nederland | ViaCust"
        description="Alles over de wetgeving, RDW-ontheffingen en inzet van transportbegeleiders in Nederland. Ontdek hoe ViaCust uw Nederlandse ritten compliant automatiseert."
        canonical="https://viacust.com/info/nederland"
      />
      <Nav />
      <main className="px-5 md:px-8 py-10 md:py-14">
        <div className="max-w-5xl mx-auto space-y-10">
          <header className="space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              {t("infoNL.title")}
            </h1>
            <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
              {t("infoNL.intro")}
            </p>
            <div>
              <Button asChild variant="ghost" size="sm" className="px-0 h-auto text-primary hover:bg-transparent">
                <Link to="/info/belgie">{t("infoCommon.viewBE")} →</Link>
              </Button>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoNL.highwayTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoNL.highwayHint")}
              </CardContent>
            </Card>
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoNL.secondaryTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoNL.secondaryHint")}
              </CardContent>
            </Card>
            <Card className="border-input">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {t("infoNL.convoyTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("infoNL.convoyHint")}
              </CardContent>
            </Card>
          </section>

          <section>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="highway">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoNL.highwayTitle")}
                </AccordionTrigger>
                <AccordionContent>
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
                          <Td>40 m – 50 m<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                          <Td>&gt; 50 m<br/><span className="text-muted-foreground">20:00 – 06:00</span></Td>
                        </tr>
                        <tr>
                          <Td><strong>{t("infoCommon.width")}</strong></Td>
                          <Td>4,01 m – 4,50 m<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                          <Td>
                            4,51 m – 5,00 m<br/><span className="text-muted-foreground">20:00 – 06:00</span><br/><br/>
                            &gt; 5,00 m<br/><span className="text-muted-foreground">22:00 – 06:00</span>
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
                          <Td>&gt; 100.000 kg<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="secondary">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoNL.secondaryTitle")}
                </AccordionTrigger>
                <AccordionContent>
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
                          <Td>27,51 m – 32 m<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                          <Td>&gt; 32,01 m<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00 **</span></Td>
                        </tr>
                        <tr>
                          <Td><strong>{t("infoCommon.width")}</strong></Td>
                          <Td>3,51 m – 4 m<br/><span className="text-muted-foreground">{t("infoNL.noBeperking")}</span></Td>
                          <Td>
                            4,01 m – 4,99 m<br/>
                            <span className="text-muted-foreground">10:00 – 15:00 (tot 4,51 m)</span><br/>
                            <span className="text-muted-foreground">20:00 – 06:00</span><br/><br/>
                            &gt; 5,00 m<br/><span className="text-muted-foreground">22:00 – 06:00</span>
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
                          <Td>&gt; 100.000 kg<br/><span className="text-muted-foreground">10:00 – 15:00 &amp; 20:00 – 06:00</span></Td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 space-y-1 text-xs text-muted-foreground leading-relaxed">
                    <p>{t("infoNL.note1")}</p>
                    <p>{t("infoNL.note2")}</p>
                    <p>{t("infoNL.note3")}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="convoy">
                <AccordionTrigger className="text-base font-semibold">
                  {t("infoNL.convoyTitle")}
                </AccordionTrigger>
                <AccordionContent>
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

export default InfoNederland;
