import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

export function SubscriptionBanner() {
  const { role, isAdmin } = useAuth();
  const { subscription, isActive, loading } = useSubscription();

  if (loading || isAdmin) return null;
  if (role !== "begeleider" && role !== "opdrachtgever") return null;

  if (!isActive) {
    return (
      <div className="bg-brass-deep text-parchment px-4 py-3 text-sm flex items-center justify-center gap-3 flex-wrap">
        <span>
          Je hebt nog geen actief abonnement.{" "}
          <strong>30 dagen gratis proberen</strong> — opzegbaar tijdens de proefperiode.
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
        Je laatste betaling is mislukt. <Link to="/abonnement" className="underline font-semibold">Werk je betaalmethode bij</Link>
      </div>
    );
  }

  return null;
}
