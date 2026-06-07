import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

import { CheckoutDialog } from "@/components/CheckoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

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
      <main className="container mx-auto px-4 py-6">
        <p className="text-sm text-muted-foreground">{t("subscription.loading")}</p>
      </main>
    );
  }

  if (!role) {
    return (
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("subscription.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subscription.roleUndetermined")}</p>
      </main>
    );
  }

  // Opdrachtgevers: geen Stripe-abo meer. Toon info-kaart.
  if (role === "opdrachtgever") {
    return (
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-xl">
        <header className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("subscription.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subscription.subtitle")}</p>
        </header>

        <Card className="border-input">
          <CardHeader className="space-y-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">{PLANS.opdrachtgever.title}</CardTitle>
              <CardDescription>{PLANS.opdrachtgever.description}</CardDescription>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">€25,00</span>
              <span className="text-base text-muted-foreground line-through">€50,00</span>
              <Badge variant="secondary">50% introductiekorting</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {PLANS.opdrachtgever.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 text-primary">&#10003;</span>
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <div className="flex items-start gap-3 rounded-md border border-input bg-muted/50 p-3 w-full">
              <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Probeer 30 dagen gratis</p>
                <p className="text-sm text-muted-foreground">
                  Maandelijks opzegbaar. Daarna €25 per halve maand op je platformfactuur (€50/maand).
                </p>
              </div>
            </div>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const plan = role === "begeleider" ? PLANS.begeleider : null;
  if (!plan) {
    return (
      <main className="container mx-auto px-4 py-6">
        <p className="text-muted-foreground">{t("subscription.noPlan")}</p>
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
    <main className="container mx-auto px-4 py-6 md:py-8 max-w-xl">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("subscription.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subscription.subtitle")}</p>
        <p className="text-xs text-muted-foreground">
          {t("subscription.questions")}{" "}
          <a href="mailto:support@viacust.com" className="text-primary hover:underline">
            support@viacust.com
          </a>
        </p>
      </header>

      <Card className="border-input">
        <CardHeader className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="text-xl">{plan.title}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </div>
            <div className="text-right shrink-0">
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">{plan.price}</p>
              <p className="text-xs text-muted-foreground">{plan.period}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 text-primary">&#10003;</span>
                <span className="text-foreground">{f}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-3 rounded-md border border-input bg-muted/50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("subscription.trial30Heading") || "Probeer 30 dagen gratis"}
              </p>
              <p className="text-sm text-muted-foreground">{t("subscription.trial30Body")}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("subscription.loading")}</p>
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
                    <span className="text-sm font-medium text-foreground">
                      {isTrial
                        ? `${t("subscription.trialActive")}${daysLeft !== null ? ` — ${t("subscription.daysLeft", { count: daysLeft, n: daysLeft })}` : ""}`
                        : t("subscription.active")}
                      {subscription?.cancel_at_period_end && endDate
                        ? ` — ${t("subscription.endsOn", { date: endStr })}`
                        : ""}
                    </span>
                  </div>
                  {isTrial && endDate && (
                    <p className="text-xs text-muted-foreground">
                      {t("subscription.firstPaymentOn", { date: endStr })}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={openPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? t("subscription.managing") : t("subscription.manage")}
                  </Button>
                </div>
              );
            })()
          ) : (
            (() => {
              const canStart = isAdmin || approvalStatus === "approved";
              return (
                <div className="space-y-3">
                  {!canStart && (
                    <div className="rounded-md border border-input bg-muted/50 p-3 text-sm">
                      <p className="font-medium text-foreground">{t("subscription.notApprovedTitle")}</p>
                      <p className="mt-1 text-muted-foreground">{t("subscription.notApprovedBody")}</p>
                    </div>
                  )}
                  <Button
                    onClick={() => setOpenCheckout(true)}
                    disabled={!canStart}
                    className="w-full"
                  >
                    {t("subscription.startTrial")}
                  </Button>
                </div>
              );
            })()
          )}
        </CardFooter>
      </Card>

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
    
    <SeoHead title="Tarieven & Licenties | ViaCust" description="Transparante tarieven en licenties voor slimme rittenplanning met ViaCust. Bekijk en beheer je abonnement, facturering en betalingsmethode." />
    <Nav />
    <SubscriptionInner />
    <Footer />
  </RequireAuth>
);

export default Subscription;
