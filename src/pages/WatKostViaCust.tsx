import { SeoHead } from "@/components/SeoHead";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, UserRound, ClipboardList, Building2 } from "lucide-react";

const FeatureItem = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-3 text-sm text-slate-600">
    <span className="mt-0.5 text-primary">&#10003;</span>
    <span>{children}</span>
  </div>
);

const cardClass =
  "border border-slate-200/70 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-white";

type Plan = {
  name: string;
  price: string;
  subtitle: string;
  features: string[];
  cta: string;
  to: string;
  icon: React.ReactNode;
};

const plans: Plan[] = [
  {
    name: "Zelfstandige Begeleider (ZZP)",
    price: "€ 19,-",
    subtitle: "Voor de individuele professional. Ontvang ritten, maak ritbonnen en factureer foutloos.",
    features: [
      "Onbeperkt ritten ontvangen & registreren",
      "Digitale uren- en kilometerregistratie",
      "Automatische PDF-facturatie",
      "Directe Google Agenda integratie",
      "100% vrij van rit-commissies",
    ],
    cta: "Start als Begeleider",
    to: "/auth?package=zzp",
    icon: <UserRound className="size-4 text-primary" />,
  },
  {
    name: "Transporteur / Planner (MKB)",
    price: "€ 49,-",
    subtitle: "Voor planners die overzicht willen. Wijs ritten toe en accordeer ritbonnen digitaal.",
    features: [
      "Onbeperkt ritten aanmaken & toewijzen",
      "Realtime overzicht in planningsdashboard",
      "Eigen netwerk van begeleiders uitnodigen",
      "Digitale ritbonnen centraal accorderen",
      "1-klik export voor de boekhouding",
    ],
    cta: "Start als Planner",
    to: "/auth?package=planner",
    icon: <ClipboardList className="size-4 text-primary" />,
  },
  {
    name: "Begeleidingsbedrijf (Vloot)",
    price: "€ 99,-",
    subtitle: "Compleet overzicht van je eigen vloot en externe charters in één centraal dashboard.",
    features: [
      "Alle functies van Planner & ZZP",
      "Meerdere planners-accounts",
      "Onbeperkt eigen voertuigen koppelen",
      "Gecentraliseerde facturatiestromen",
      "Uitgebreide bedrijfsrapportages",
    ],
    cta: "Start met je Vloot",
    to: "/auth?package=vloot",
    icon: <Building2 className="size-4 text-primary" />,
  },
];

const WatKostViaCust = () => {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SeoHead
        title="Tarieven & Prijzen | ViaCust"
        description="Duidelijke en transparante tarieven voor ViaCust. Ontdek onze abonnementen voor zelfstandige begeleiders, transportplanners en begeleidingsbedrijven."
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
              Vaste maandtarieven zonder verborgen kosten. Kies het abonnement dat past bij jouw organisatie.
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
              {plans.map((plan) => (
                <Card key={plan.name} className={cardClass}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 pb-1">
                      {plan.icon}
                      <CardDescription className="text-sm font-medium text-muted-foreground">
                        {plan.name}
                      </CardDescription>
                    </div>
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-base font-normal"> / maand</span>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground pt-2 leading-relaxed">{plan.subtitle}</p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col pt-0">
                    <div className="border-t border-border pt-4 flex flex-1 flex-col gap-3">
                      {plan.features.map((feature) => (
                        <FeatureItem key={feature}>{feature}</FeatureItem>
                      ))}
                    </div>
                    <p className="pt-4 text-xs text-muted-foreground">Maandelijks opzegbaar</p>
                    <div className="pt-4">
                      <Button asChild className="w-full justify-start">
                        <Link to={plan.to}>{plan.cta}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WatKostViaCust;
