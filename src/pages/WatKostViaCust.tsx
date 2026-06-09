import { SeoHead } from "@/components/SeoHead";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Users } from "lucide-react";

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 text-sm text-slate-600">
    <span className="mt-0.5 text-primary">&#10003;</span>
    <span>{children}</span>
  </div>
);

const WatKostViaCust = () => {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SeoHead
        title="Tarieven & Prijzen | ViaCust"
        description="Duidelijke en transparante tarieven voor ViaCust. Ontdek onze flexibele abonnementen voor transportplanners, zelfstandige begeleiders en begeleidingsbedrijven."
      />
      <Nav />
      <main>
        <section className="py-10 md:py-14 px-5 md:px-8 bg-slate-50/60 border-b border-slate-100">
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 mb-3">
              <Sparkles className="size-3.5 text-primary" />
              <span className="uppercase tracking-[0.2em]">Tarieven</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-slate-900">
              Wat kost ViaCust
            </h1>
            <p className="text-slate-500 max-w-2xl leading-relaxed">
              Transparante tarieven zonder verborgen kosten. Kies het abonnement dat past bij jouw organisatie.
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16 px-5 md:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Kies je abonnement
            </h2>
            <div className="grid md:grid-cols-3 gap-6 items-stretch">
              {/* Card 1: Opdrachtgever (Planner) */}
              <Card className="border border-slate-200/70 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col bg-white">
                <CardHeader className="pb-4">
                  <CardDescription className="text-sm font-medium text-muted-foreground mb-1">
                    Opdrachtgever (Planner)
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    <span className="text-3xl font-bold">€50,00</span>
                    <span className="text-muted-foreground text-base font-normal"> / maand</span>
                  </CardTitle>
                  <div className="pt-2">
                    <Badge variant="default">Lanceringsactie</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground pt-2">
                    Eerste 30 dagen gratis + 6 maanden 50% korting
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <div className="border-t border-border pt-4 flex-1 flex flex-col gap-3">
                    <FeatureItem>+ €2,50 servicefee per geboekte begeleider per rit</FeatureItem>
                    <FeatureItem>Onbeperkt ritten plaatsen</FeatureItem>
                    <FeatureItem>Koppel begeleiders eenvoudig</FeatureItem>
                    <FeatureItem>Automatische ritfacturatie</FeatureItem>
                    <FeatureItem>Realtime rit-tracking</FeatureItem>
                    <FeatureItem>Centraal dashboard</FeatureItem>
                    <FeatureItem>Wekelijkse betalingen</FeatureItem>
                    <FeatureItem>Ideaal voor: Transportplanners en logistiek managers</FeatureItem>
                  </div>
                  <div className="pt-4">
                    <Button asChild className="w-full justify-start">
                      <Link to="/auth?role=client">Start als opdrachtgever</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Zelfstandige Begeleider (ZZP) */}
              <Card className="border border-slate-200/70 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col bg-white">
                <CardHeader className="pb-4">
                  <CardDescription className="text-sm font-medium text-muted-foreground mb-1">
                    Zelfstandige Begeleider (ZZP)
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    <span className="text-3xl font-bold">€2,50</span>
                    <span className="text-muted-foreground text-base font-normal"> / maand</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pt-2">
                    Eerste 30 dagen gratis, maandelijks opzegbaar
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <div className="border-t border-border pt-4 flex-1 flex flex-col gap-3">
                    <FeatureItem>+ €1,- servicefee per succesvol gereden rit</FeatureItem>
                    <FeatureItem>Geverifieerd profiel op de kaart</FeatureItem>
                    <FeatureItem>Ontvang ritopdrachten</FeatureItem>
                    <FeatureItem>Gebruik je eigen voertuig</FeatureItem>
                    <FeatureItem>Agenda-integratie</FeatureItem>
                    <FeatureItem>Directe communicatie</FeatureItem>
                    <FeatureItem>Automatische facturatie</FeatureItem>
                    <FeatureItem>Flexibele planning</FeatureItem>
                  </div>
                  <div className="pt-4">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/auth?role=escort">Start als begeleider</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Begeleidingsbedrijf (Vloot) */}
              <Card className="border border-slate-200/70 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col bg-white">
                <CardHeader className="pb-4">
                  <CardDescription className="text-sm font-medium text-muted-foreground mb-1">
                    Begeleidingsbedrijf (Vloot)
                  </CardDescription>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    <span className="text-3xl font-bold">€10,00</span>
                    <span className="text-muted-foreground text-base font-normal"> / maand</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground pt-2">
                    Eerste 30 dagen gratis, maandelijks opzegbaar
                  </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <div className="border-t border-border pt-4 flex-1 flex flex-col gap-3">
                    <FeatureItem>+ €1,- servicefee per succesvol gereden rit</FeatureItem>
                    <FeatureItem>Onbeperkt chauffeurs &amp; auto&apos;s koppelen</FeatureItem>
                    <FeatureItem>Centraal kantoordashboard voor de planner</FeatureItem>
                    <FeatureItem>Centraal teambeheer</FeatureItem>
                    <FeatureItem>Onbeperkt begeleiders uitnodigen</FeatureItem>
                    <FeatureItem>Begeleiders accepteren namens het bedrijf</FeatureItem>
                    <FeatureItem>Consolideerde facturatie</FeatureItem>
                    <FeatureItem>Volledige platformtoegang</FeatureItem>
                  </div>
                  <div className="pt-4">
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to="/auth?role=escort">Start als bedrijf</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14 px-5 md:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <Button asChild size="lg">
              <Link to="/auth">Direct starten</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WatKostViaCust;
