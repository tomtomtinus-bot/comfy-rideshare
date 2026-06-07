import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const HoeWerktViaCust = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("client");

  const clientSteps = [
    { n: 1, title: t("howItWorks.c1t"), body: t("howItWorks.c1b") },
    { n: 2, title: t("howItWorks.c2t"), body: t("howItWorks.c2b") },
    { n: 3, title: t("howItWorks.c3t"), body: t("howItWorks.c3b") },
  ];
  const escortSteps = [
    { n: 1, title: t("howItWorks.e1t"), body: t("howItWorks.e1b") },
    { n: 2, title: t("howItWorks.e2t"), body: t("howItWorks.e2b") },
    { n: 3, title: t("howItWorks.e3t"), body: t("howItWorks.e3b") },
  ];
  const why = [
    [t("howItWorks.w1t"), t("howItWorks.w1b")],
    [t("howItWorks.w2t"), t("howItWorks.w2b")],
    [t("howItWorks.w3t"), t("howItWorks.w3b")],
    [t("howItWorks.w4t"), t("howItWorks.w4b")],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Hoe werkt ViaCust? | Slimme Logistieke Software"
        description="Ontdek hoe eenvoudig het is om als transportplanner of gecertificeerd begeleider ritten te beheren, te matchen en te factureren."
      />
      <Nav />
      <main className="max-w-5xl mx-auto px-5 md:px-8">
        <section className="pt-6 md:pt-8 pb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            {t("howItWorks.title")}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("howItWorks.intro")}
          </p>
        </section>

        <section className="pb-10 md:pb-14">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-8">
              <TabsTrigger value="client">Voor Opdrachtgevers</TabsTrigger>
              <TabsTrigger value="escort">Voor Begeleiders</TabsTrigger>
            </TabsList>

            <TabsContent value="client">
              <div className="grid md:grid-cols-3 gap-4">
                {clientSteps.map((s) => (
                  <Card key={s.n} className="border-input">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                          {s.n}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("howItWorks.step")} {s.n}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {s.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="escort">
              <div className="grid md:grid-cols-3 gap-4">
                {escortSteps.map((s) => (
                  <Card key={s.n} className="border-input">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                          {s.n}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {t("howItWorks.step")} {s.n}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {s.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="pb-10 md:pb-14">
          <h2 className="text-xl font-semibold tracking-tight text-foreground mt-8 mb-4">
            {t("howItWorks.whyTitle")}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {why.map(([title, body]) => (
              <Card key={title} className="border-input">
                <CardContent className="p-6">
                  <h3 className="text-base font-semibold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="pb-16 md:pb-20 text-center">
          <Button asChild size="lg">
            <Link to="/auth">{t("howItWorks.ctaClient")}</Link>
          </Button>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default HoeWerktViaCust;
