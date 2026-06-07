import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

const SubscriptionInner = () => {
  const { t, i18n } = useTranslation();
  const { user, role, loading: authLoading, approvalStatus, isAdmin } = useAuth();
  const { subscription, isActive, loading } = useSubscription();
  const [openCheckout, setOpenCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const PLANS = {
    opdrachtgever: {
      priceId: "opdrachtgever_monthly",
      title: t("subscription.plans.clientTitle"),
      price: t("subscription.plans.clientPrice"),
      period: t("subscription.plans.clientPeriod"),
      description: t("subscription.plans.clientDescription"),
      features: [
        t("subscription.plans.clientF1"),
        t("subscription.plans.clientF2"),
        t("subscription.plans.clientF3"),
        t("subscription.plans.clientF4"),
        t("subscription.plans.clientF5"),
        t("subscription.plans.clientF6"),
      ],
    },
    begeleider: {
      priceId: "begeleider_monthly",
      title: t("subscription.plans.escortTitle"),
      price: t("subscription.plans.escortPrice"),
      period: t("subscription.plans.escortPeriod"),
      description: t("subscription.plans.escortDescription"),
      features: [
        t("subscription.plans.escortF1"),
        t("subscription.plans.escortF2"),
        t("subscription.plans.escortF3"),
        t("subscription.plans.escortF4"),
        t("subscription.plans.escortF5"),
      ],
    },
  } as const;

  if (authLoading) {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-sm text-brass-deep/80 uppercase tracking-widest">{t("subscription.loading")}</p>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep">{t("subscription.title")}</h1>
        <p className="mt-3 text-brass-deep/70">{t("subscription.roleUndetermined")}</p>
      </main>
    );
  }
  // Opdrachtgevers: geen Stripe-abo meer. Toon info-kaart.
  if (role === "opdrachtgever") {
    return (
      <main className="container mx-auto px-4 py-10 md:py-16 max-w-3xl">
        <header className="mb-10">
          <h1 className="font-display text-3xl md:text-4xl text-brass-deep">{t("subscription.title")}</h1>
          <p className="text-sm text-brass-deep/80 mt-2">{t("subscription.subtitle")}</p>
        </header>
        <section className="bg-card shadow-etched p-6 md:p-10 space-y-5">
          <div>
            <h2 className="font-display text-2xl text-brass-deep">{PLANS.opdrachtgever.title}</h2>
            <p className="text-sm text-brass-deep/80 mt-1">{PLANS.opdrachtgever.description}</p>
          </div>
          <div className="flex items-baseline gap-3">
            <p className="font-display text-3xl text-brass-gold tabular-nums">€50</p>
            <p className="text-xs uppercase tracking-widest text-brass-deep/80 font-bold">per maand</p>
          </div>
          <ul className="space-y-2 text-sm">
            {PLANS.opdrachtgever.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-brass-gold">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4 border-t border-brass-deep/10 space-y-2 text-sm text-brass-deep/80">
            <p>
              <strong className="text-brass-deep">Eerste 30 dagen gratis.</strong>{" "}
              Daarna €25 per halve maand op je platformfactuur (€50/maand).
            </p>
            <p className="text-xs text-brass-deep/80">
              Facturatie loopt automatisch — je ontvangt 2× per maand (op de 15e en
              de laatste dag van de maand) een platformfactuur met de ritfee én
              het abonnementsdeel. Geen aparte aanmelding nodig.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const plan = role === "begeleider" ? PLANS.begeleider : null;
  if (!plan) {
    return (
      <main className="container mx-auto px-4 py-12">
        <p className="text-brass-deep/80">{t("subscription.noPlan")}</p>
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
      if (error || !data?.url) throw new Error(error?.message || t("subscription.portalUnavailable"));
      window.open(data.url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("subscription.portalUnavailable"));
    } finally {
      setPortalLoading(false);
    }
  };

  const dateLocale = (i18n.resolvedLanguage || "nl") + "-" + (i18n.resolvedLanguage === "en" ? "GB" : (i18n.resolvedLanguage || "nl").toUpperCase());

  return (
    <main className="container mx-auto px-4 py-10 md:py-16 max-w-3xl">
      <header className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep">{t("subscription.title")}</h1>
        <p className="text-sm text-brass-deep/80 mt-2">{t("subscription.subtitle")}</p>
        <p className="text-xs text-brass-deep/80 mt-1">
          {t("subscription.questions")}{" "}
          <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
            support@viacust.com
          </a>
        </p>
      </header>

      <section className="bg-card shadow-etched p-6 md:p-10 space-y-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-2xl text-brass-deep">{plan.title}</h2>
            <p className="text-sm text-brass-deep/80 mt-1">{plan.description}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl text-brass-gold tabular-nums">{plan.price}</p>
            <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{plan.period}</p>
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
            <p className="text-sm text-brass-deep/80">{t("subscription.loading")}</p>
          ) : isActive ? (
            (() => {
              const isTrial = subscription?.status === "trialing";
              const endDate = subscription?.current_period_end
                ? new Date(subscription.current_period_end)
                : null;
              const daysLeft = endDate
                ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))
                : null;
              const endStr = endDate ? endDate.toLocaleDateString(dateLocale) : "";
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${isTrial ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span className="text-sm font-semibold text-brass-deep">
                      {isTrial
                        ? `${t("subscription.trialActive")}${daysLeft !== null ? ` — ${t("subscription.daysLeft", { count: daysLeft, n: daysLeft })}` : ""}`
                        : t("subscription.active")}
                      {subscription?.cancel_at_period_end && endDate
                        ? ` — ${t("subscription.endsOn", { date: endStr })}`
                        : ""}
                    </span>
                  </div>
                  {isTrial && endDate && (
                    <p className="text-xs text-brass-deep/80">
                      {t("subscription.firstPaymentOn", { date: endStr })}
                    </p>
                  )}
                  <button
                    onClick={openPortal}
                    disabled={portalLoading}
                    className="px-5 py-2.5 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-parchment disabled:opacity-50"
                  >
                    {portalLoading ? t("subscription.managing") : t("subscription.manage")}
                  </button>
                </div>
              );
            })()
          ) : (
            (() => {
              const canStart = isAdmin || approvalStatus === "approved";
              return (
                <div className="space-y-3">
                  <p className="text-sm text-brass-deep/70">
                    <span className="font-semibold text-brass-deep">{t("subscription.trial30Heading")}</span>{" "}
                    {t("subscription.trial30Body")}
                  </p>
                  {!canStart && (
                    <div className="bg-brass-gold/10 border-l-2 border-brass-gold p-3 text-xs text-brass-deep/80">
                      <p className="font-semibold text-brass-deep">{t("subscription.notApprovedTitle")}</p>
                      <p className="mt-1">{t("subscription.notApprovedBody")}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setOpenCheckout(true)}
                    disabled={!canStart}
                    className="px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brass-deep"
                  >
                    {t("subscription.startTrial")}
                  </button>
                </div>
              );
            })()
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
    <SeoHead title="Abonnement | ViaCust" description="Bekijk en beheer je ViaCust abonnement, facturering en betalingsmethode." />
    <Nav />
    <SubscriptionInner />
    <Footer />
  </RequireAuth>
);

export default Subscription;
