import { Link } from "react-router-dom";
import { ChevronRight, User, Receipt, CreditCard, Shield, ListChecks } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Card } from "@/components/ui/card";
import { GoogleCalendarCard } from "@/components/site/GoogleCalendarCard";
import { GoogleAgendaStatus } from "@/components/site/GoogleAgendaStatus";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";

const Inner = () => {
  const { role } = useAuth();
  const { isDriver } = useCompany();
  const showFinance = !isDriver;
  const links = [
    { to: "/profiel", label: "Profielinstellingen", icon: User, show: role === "begeleider" },
    { to: "/facturatiegegevens", label: "Facturatiegegevens", icon: Receipt, show: showFinance },
    { to: "/abonnement", label: "Abonnement", icon: CreditCard, show: showFinance },
    { to: "/beveiliging", label: "Beveiliging", icon: Shield, show: true },
    { to: "/geschiedenis", label: "Geschiedenis", icon: ListChecks, show: true },
  ].filter((l) => l.show);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Instellingen | ViaCust" description="Accountgegevens en Google Agenda-koppeling in ViaCust." />
      <Nav />
      <main className="px-4 md:px-6 py-4 md:py-6 min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
          {!isDriver && <OnboardingChecklist />}
          <Card className="divide-y divide-border">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                <l.icon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{l.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
          {role === "begeleider" ? <GoogleAgendaStatus /> : <GoogleCalendarCard />}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Settings = () => (
  <RequireAuth>
    <Inner />
  </RequireAuth>
);

export default Settings;
