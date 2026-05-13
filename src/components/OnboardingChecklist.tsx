import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Circle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

type Step = {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
  blocked?: boolean;
  blockedLabel?: string;
};

export const OnboardingChecklist = () => {
  const { user, role, approvalStatus, isAdmin } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();
  const [billingComplete, setBillingComplete] = useState<boolean | null>(null);
  const [hasRide, setHasRide] = useState<boolean | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHidden(localStorage.getItem("viacust_onboarding_hidden") === "true");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (role === "begeleider") {
        const { data } = await supabase
          .from("escort_profiles")
          .select("company_name, billing_email, billing_address, billing_postcode, billing_city, kvk_number, iban")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setBillingComplete(
          !!(data?.company_name && data?.billing_email && data?.billing_address && data?.billing_postcode && data?.billing_city && data?.kvk_number && data?.iban),
        );
      } else {
        const { data } = await supabase
          .from("profiles")
          .select("company_name, billing_email, billing_address, billing_postcode, billing_city, kvk_number")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setBillingComplete(
          !!(data?.company_name && data?.billing_email && data?.billing_address && data?.billing_postcode && data?.billing_city && data?.kvk_number),
        );
      }

      if (role === "opdrachtgever") {
        const { count } = await supabase
          .from("rides")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id);
        if (cancelled) return;
        setHasRide((count ?? 0) > 0);
      } else {
        setHasRide(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  if (!user || isAdmin || hidden) return null;
  if (subLoading || billingComplete === null || hasRide === null) return null;

  const approved = approvalStatus === "approved";
  const steps: Step[] = [
    {
      key: "approval",
      label: "Account goedgekeurd",
      description: approved
        ? "Je account is geverifieerd door ons team."
        : "We controleren je registratie. Dit duurt meestal binnen 1 werkdag.",
      href: "/profiel",
      done: approved,
    },
    {
      key: "billing",
      label: "Facturatiegegevens invullen",
      description: "Bedrijfsnaam, adres en KvK/BTW nodig om facturen te kunnen versturen.",
      href: "/facturatiegegevens",
      done: !!billingComplete,
    },
    {
      key: "subscription",
      label: "Start je 30 dagen gratis proefperiode",
      description: approved
        ? "Activeer je abonnement om het platform te gebruiken."
        : "Beschikbaar zodra je account is goedgekeurd.",
      href: "/abonnement",
      done: isActive,
      blocked: !approved && !isActive,
      blockedLabel: "Wacht op goedkeuring",
    },
    ...(role === "opdrachtgever"
      ? [
          {
            key: "ride",
            label: "Maak je eerste rit aan",
            description: "Plan een rit en ontvang voorstellen van begeleiders.",
            href: "/rit-aanvragen",
            done: !!hasRide,
            blocked: !approved || !isActive,
            blockedLabel: !approved ? "Wacht op goedkeuring" : "Abonnement vereist",
          } as Step,
        ]
      : []),
  ];

  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  if (done === total) return null;

  return (
    <section className="mb-8 bg-card shadow-etched border-l-4 border-brass-gold p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Aan de slag</p>
          <h2 className="font-display text-xl text-brass-deep mt-1">
            Nog {total - done} {total - done === 1 ? "stap" : "stappen"} te gaan
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem("viacust_onboarding_hidden", "true");
            setHidden(true);
          }}
          className="text-xs text-brass-deep/50 hover:text-brass-deep underline"
        >
          Verbergen
        </button>
      </div>

      <ol className="space-y-2">
        {steps.map((s) => {
          const Icon = s.done ? Check : s.blocked ? Clock : Circle;
          const content = (
            <div
              className={`flex items-start gap-3 p-3 transition-colors ${
                s.done ? "bg-emerald-50/50" : s.blocked ? "bg-parchment/40" : "bg-parchment/60 hover:bg-parchment"
              }`}
            >
              <span
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  s.done
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : s.blocked
                      ? "border-brass-gold/50 text-brass-gold"
                      : "border-brass-deep/30 text-brass-deep/40"
                }`}
              >
                <Icon className="size-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${s.done ? "text-brass-deep/60 line-through" : "text-brass-deep"}`}>
                    {s.label}
                  </p>
                  {s.blocked && !s.done && (
                    <span className="text-[10px] uppercase tracking-widest font-bold text-brass-gold bg-brass-gold/15 px-2 py-0.5">
                      {s.blockedLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-brass-deep/60 mt-0.5">{s.description}</p>
              </div>
            </div>
          );
          if (s.done || s.blocked) {
            return <li key={s.key}>{content}</li>;
          }
          return (
            <li key={s.key}>
              <Link to={s.href} className="block">
                {content}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
};
