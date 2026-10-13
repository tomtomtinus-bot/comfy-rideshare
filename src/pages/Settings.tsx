import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Building2, CreditCard, Link2, Bell, ExternalLink, Pencil, Shield } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoogleCalendarCard } from "@/components/site/GoogleCalendarCard";
import { GoogleAgendaStatus } from "@/components/site/GoogleAgendaStatus";
import { NotificationPreferencesCard } from "@/components/site/NotificationPreferencesCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { getStripeEnvironment } from "@/lib/stripe";

const PLAN_NAMES: Record<string, string> = {
  opdrachtgever_monthly: "Opdrachtgever — € 50 per maand",
  begeleider_monthly: "Begeleider (ZZP) — € 2,50 per maand",
  vloot_monthly: "Vloot — € 10 per maand",
};

const Section = ({ icon: Icon, title, action, children }: { icon: any; title: string; action?: React.ReactNode; children: React.ReactNode }) => (
  <Card className="p-5">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="text-base font-semibold tracking-tight">{title}</h2></div>
      {action}
    </div>
    {children}
  </Card>
);

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-sm font-medium truncate">{value || <span className="text-muted-foreground font-normal">Niet ingevuld</span>}</div>
  </div>
);

const Inner = () => {
  const { user, role } = useAuth();
  const isEscort = role === "begeleider";
  const { subscription, isActive } = useSubscription();
  const [biz, setBiz] = useState<any>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from(isEscort ? "escort_profiles" : "profiles")
      .select("company_name, kvk_number, vat_number, billing_address, billing_postcode, billing_city, billing_email")
      .eq("id", user.id).maybeSingle().then(({ data }) => setBiz(data ?? {}));
  }, [user, isEscort]);

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: { returnUrl: `${window.location.origin}/instellingen`, environment: getStripeEnvironment() },
      });
      if (error || !data?.url) throw new Error("Klantportaal is nu niet beschikbaar");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Klantportaal is nu niet beschikbaar");
    } finally { setPortalBusy(false); }
  };

  const address = biz ? [biz.billing_address, [biz.billing_postcode, biz.billing_city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Instellingen | ViaCust" description="Bedrijfsgegevens, koppelingen, abonnement en notificaties in ViaCust." />
      <Nav />
      <main className="px-4 md:px-6 py-4 md:py-6 min-h-[calc(100vh-5rem)]">
        <div className="max-w-5xl mx-auto space-y-4">
          <h1 className="text-xl font-semibold tracking-tight">Instellingen</h1>

          <Section icon={Building2} title="Bedrijfsgegevens"
            action={<Button asChild size="sm" variant="outline" className="h-8"><Link to="/facturatiegegevens"><Pencil className="h-3.5 w-3.5 mr-1" />Bewerken</Link></Button>}>
            {biz == null ? <p className="text-sm text-muted-foreground">Laden…</p> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Bedrijfsnaam" value={biz.company_name} />
                <Field label="KvK-nummer" value={biz.kvk_number} />
                <Field label="Btw-nummer" value={biz.vat_number} />
                <Field label="Adres" value={address} />
                <Field label="E-mail voor administratie" value={biz.billing_email} />
              </div>
            )}
          </Section>

          <Section icon={Link2} title="Koppelingen">
            {isEscort ? <GoogleAgendaStatus /> : <GoogleCalendarCard />}
          </Section>

          <Section icon={CreditCard} title="Abonnement & Facturatie"
            action={<Button size="sm" className="h-8" onClick={openPortal} disabled={portalBusy}><ExternalLink className="h-3.5 w-3.5 mr-1" />{portalBusy ? "Bezig…" : "Stripe klantportaal"}</Button>}>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Huidig plan</div>
                <div className="text-sm font-medium">{subscription ? (PLAN_NAMES[subscription.price_id] ?? subscription.price_id) : "Geen abonnement"}</div>
              </div>
              {subscription && <Badge variant="outline" className="font-normal">{isActive ? "Actief" : subscription.status}</Badge>}
              <Button asChild size="sm" variant="ghost" className="h-8 ml-auto"><Link to="/abonnement">Abonnement beheren</Link></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Maandelijks opzegbaar. Je ViaCust-facturen vind je onder Facturatie → Mijn Abonnement.</p>
          </Section>

          <div>
            <div className="flex items-center gap-2 mb-2"><Bell className="h-5 w-5 text-primary" /><span className="text-base font-semibold">Notificaties</span></div>
            <NotificationPreferencesCard showTicketAlerts={!isEscort} className="" />
          </div>

          <Link to="/beveiliging" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Shield className="h-4 w-4" />Beveiliging en wachtwoord</Link>
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
