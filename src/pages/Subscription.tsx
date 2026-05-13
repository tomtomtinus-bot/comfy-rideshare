import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

const PLANS = {
  opdrachtgever: {
    priceId: "opdrachtgever_monthly",
    title: "Opdrachtgever abonnement",
    price: "€50,00",
    period: "per maand · excl. BTW",
    description:
      "Toegang tot het ViaCust platform: ritten plannen, begeleiders boeken, vergunningen beheren. Plus 1,5% platform fee per rit (op de wekelijkse platformfactuur). Het eerste jaar betaalt u slechts €25,00 per maand dankzij 50% korting.",
    features: [
      "30 dagen gratis proberen — opzegbaar tijdens de proefperiode",
      "1e jaar 50% korting: €25,00 per maand i.p.v. €50,00",
      "Onbeperkt ritten plannen",
      "Toegang tot het volledige begeleidersnetwerk",
      "Vergunningen automatisch verwerken",
      "Platform fee 1,5% per rit (verzameld per week)",
    ],
  },
  begeleider: {
    priceId: "begeleider_monthly",
    title: "Begeleider abonnement",
    price: "€2,50",
    period: "per maand · excl. BTW",
    description: "Actief blijven op ViaCust: ritten ontvangen, agenda koppelen, automatische facturatie.",
    features: [
      "30 dagen gratis proberen — opzegbaar tijdens de proefperiode",
      "Ritten ontvangen en accepteren",
      "Google Agenda-koppeling",
      "Automatische wekelijkse facturatie",
      "Volledige toegang tot het platform",
    ],
  },
} as const;

const SubscriptionInner = () => {
  const { user, role, loading: authLoading } = useAuth();
  const { subscription, isActive, loading } = useSubscription();
  const [openCheckout, setOpenCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-sm text-brass-deep/50 uppercase tracking-widest">Laden…</p>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep">Abonnement</h1>
        <p className="mt-3 text-brass-deep/70">
          We konden je accountrol nog niet bepalen. Neem contact op met support@viacust.com als dit blijft gebeuren.
        </p>
      </main>
    );
  }
  const plan = role === "begeleider" ? PLANS.begeleider : role === "opdrachtgever" ? PLANS.opdrachtgever : null;
  if (!plan) {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-brass-deep/60">Geen abonnement beschikbaar voor deze rol.</p>
      </main>
    );
  }

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: `${window.location.origin}/abonnement`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error(error?.message || "Portal niet beschikbaar");
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portal niet beschikbaar");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-10 md:py-16 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep">Abonnement</h1>
        <p className="text-sm text-brass-deep/60 mt-2">Beheer je ViaCust abonnement.</p>
        <p className="text-xs text-brass-deep/50 mt-1">
          Vragen?{" "}
          <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
            support@viacust.com
          </a>
        </p>
      </header>

      <section className="bg-card shadow-etched p-6 md:p-10 space-y-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-2xl text-brass-deep">{plan.title}</h2>
            <p className="text-sm text-brass-deep/60 mt-1">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-brass-gold tabular-nums">{plan.price}</p>
            <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{plan.period}</p>
          </div>
        </div>

        <ul className="space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2">
              <span className="text-brass-gold">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="pt-4 border-t border-brass-deep/10">
          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : isActive ? (
            (() => {
              const isTrial = subscription?.status === "trialing";
              const endDate = subscription?.current_period_end
                ? new Date(subscription.current_period_end)
                : null;
              const daysLeft = endDate
                ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))
                : null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isTrial ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span className="text-sm font-semibold text-brass-deep">
                      {isTrial
                        ? `Proefperiode actief${daysLeft !== null ? ` — nog ${daysLeft} ${daysLeft === 1 ? "dag" : "dagen"}` : ""}`
                        : "Actief"}
                      {subscription?.cancel_at_period_end && endDate
                        ? ` — eindigt op ${endDate.toLocaleDateString("nl-NL")}`
                        : ""}
                    </span>
                  </div>
                  {isTrial && endDate && (
                    <p className="text-xs text-brass-deep/60">
                      Eerste betaling op {endDate.toLocaleDateString("nl-NL")}. Je kunt nu zonder kosten opzeggen via "Beheer abonnement".
                    </p>
                  )}
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="px-5 py-2.5 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-parchment disabled:opacity-50"
                  >
                    {portalLoading ? "Bezig…" : "Beheer abonnement"}
                  </button>
                </div>
              );
            })()
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-brass-deep/70">
                <span className="font-semibold text-brass-deep">30 dagen gratis proberen.</span>{" "}
                Geen kosten tijdens de proefperiode — opzeggen kan op elk moment.
              </p>
              <button
                onClick={() => setOpenCheckout(true)}
                className="px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
              >
                Start 30 dagen gratis
              </button>
            </div>
          )}
        </div>
      </section>

      <CheckoutDialog
        open={openCheckout}
        onOpenChange={setOpenCheckout}
        title={plan.title}
        priceId={plan.priceId}
        customerEmail={user?.email}
        userId={user?.id}
        returnUrl={`${window.location.origin}/abonnement?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
      />
    </main>
  );
};

const Subscription = () => (
  <RequireAuth>
    <PaymentTestModeBanner />
    <Nav />
    <SubscriptionInner />
    <Footer />
  </RequireAuth>
);

export default Subscription;
