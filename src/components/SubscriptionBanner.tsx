import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function SubscriptionBanner() {
  const { user, role, isAdmin } = useAuth();
  const { subscription, isActive, loading } = useSubscription();
  const [failedInvoice, setFailedInvoice] = useState<{ id: string; invoice_number: string } | null>(null);

  useEffect(() => {
    if (!user || role !== "opdrachtgever") { setFailedInvoice(null); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("platform_invoices")
        .select("id, invoice_number")
        .eq("client_id", user.id)
        .eq("status", "open")
        .not("last_charge_failed_at", "is", null)
        .order("last_charge_failed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setFailedInvoice((data as any) ?? null);
    };
    load();
    const ch = supabase.channel(`pi-failed-${user.id}`);
    ch.on("postgres_changes", {
      event: "*", schema: "public", table: "platform_invoices",
      filter: `client_id=eq.${user.id}`,
    }, load).subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id, role]);

  if (loading || isAdmin) return null;
  if (role !== "begeleider" && role !== "opdrachtgever") return null;

  // Failed auto-incasso (opdrachtgever) — toon altijd bovenaan
  if (failedInvoice) {
    return (
      <div className="bg-red-100 border-b border-red-300 text-red-900 px-4 py-2 text-sm text-center">
        Automatische betaling van factuur <strong>{failedInvoice.invoice_number}</strong> is mislukt.{" "}
        <Link to="/facturen" className="underline font-semibold">Bekijk factuur</Link>
        <span className="mx-1">·</span>
        <a href="mailto:support@viacust.com" className="underline font-semibold">support</a>
      </div>
    );
  }

  if (role === "begeleider" && !isActive) {
    return (
      <div
        className="bg-brass-deep text-parchment px-4 py-3 text-sm flex items-center justify-center gap-3 flex-wrap"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
      >
        <span>
          Je hebt nog geen actief abonnement.{" "}
          <strong>30 dagen gratis proberen</strong> — maandelijks opzegbaar.
        </span>
        <Link
          to="/abonnement"
          className="px-3 py-1.5 bg-brass-gold text-brass-deep text-xs uppercase tracking-widest font-bold hover:bg-parchment transition-colors"
        >
          Start nu
        </Link>
      </div>
    );
  }

  if (subscription?.status === "trialing" && subscription.current_period_end) {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86400000),
    );
    if (daysLeft <= 7) {
      return (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-xs text-center">
          Proefperiode eindigt over {daysLeft} {daysLeft === 1 ? "dag" : "dagen"}.{" "}
          <Link to="/abonnement" className="underline font-semibold">Beheer abonnement</Link>
        </div>
      );
    }
  }

  if (subscription?.status === "past_due") {
    return (
      <div className="bg-red-100 border-b border-red-300 text-red-900 px-4 py-2 text-sm text-center">
        Je laatste betaling is mislukt.{" "}
        <Link to="/abonnement" className="underline font-semibold">Werk je betaalmethode bij</Link>
        <span className="mx-1">·</span>
        <a href="mailto:support@viacust.com" className="underline font-semibold">support@viacust.com</a>
      </div>
    );
  }

  return null;
}
