import { SeoHead } from "@/components/SeoHead";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 text-sm text-muted-foreground">
    <span className="mt-0.5 text-primary">&#10003;</span>
    <span>{children}</span>
  </div>
);

const WatKostViaCust = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Tarieven & Prijzen | ViaCust"
        description="Duidelijke en transparante tarieven voor ViaCust. Ontdek onze flexibele abonnementen voor transportplanners en begeleiders van uitzonderlijk vervoer."
      />
      <Nav />
      <main>
        <section className="py-6 md:py-8 px-5 md:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-3">
              Wat kost ViaCust
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transparante tarieven zonder verborgen kosten. Kies het abonnement dat past bij jouw rol.
            </p>
          </div>
        </section>

        <section className="py-8 md:py-12 px-5 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mt-8 mb-4">
              Kies je abonnement
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1: Voor Opdrachtgevers */}
            <Card className="border-input flex flex-col">
              <CardHeader className="pb-4">
                <CardDescription className="text-sm font-medium text-muted-foreground mb-1">
                  Voor Opdrachtgevers
                </CardDescription>
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  <span className="text-muted-foreground line-through text-lg mr-2">€50,00</span>
                  <span className="text-3xl font-bold">€25,00</span>
                  <span className="text-muted-foreground text-base font-normal"> / maand</span>
                </CardTitle>
                <div className="pt-2">
                  <Badge variant="default">50% introductiekorting</Badge>
                </div>
                <p className="text-sm text-muted-foreground pt-2">
                  Eerste 30 dagen gratis
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                <div className="border-t border-border pt-4 flex-1 flex flex-col gap-3">
                  <FeatureItem>Onbeperkt ritten plaatsen</FeatureItem>
                  <FeatureItem>Koppel begeleiders eenvoudig</FeatureItem>
                  <FeatureItem>Automatische ritfacturatie</FeatureItem>
                  <FeatureItem>Realtime rit-tracking</FeatureItem>
                  <FeatureItem>Centraal dashboard</FeatureItem>
                  <FeatureItem>Wekelijkse betalingen</FeatureItem>
                </div>
                <div className="pt-4">
                  <Button asChild className="w-full">
                    <Link to="/auth?role=client">Start als opdrachtgever</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Voor Begeleiders */}
            <Card className="border-input flex flex-col">
              <CardHeader className="pb-4">
                <CardDescription className="text-sm font-medium text-muted-foreground mb-1">
                  Voor Begeleiders
                </CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  Gratis
                </CardTitle>
                <p className="text-sm text-muted-foreground pt-2">
                  €0,00 — altijd
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                <div className="border-t border-border pt-4 flex-1 flex flex-col gap-3">
                  <FeatureItem>Ontvang ritopdrachten</FeatureItem>
                  <FeatureItem>Gebruik je eigen voertuig</FeatureItem>
                  <FeatureItem>Agenda-integratie</FeatureItem>
                  <FeatureItem>Directe communicatie</FeatureItem>
                  <FeatureItem>Gratis registratie</FeatureItem>
                  <FeatureItem>Flexibele planning</FeatureItem>
                </div>
                <div className="pt-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/auth?role=escort">Start als begeleider</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
