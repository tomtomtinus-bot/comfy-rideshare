import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

interface Props {
  children: React.ReactNode;
  /** Wat de gebruiker probeert te doen (voor de melding) */
  action?: string;
}

// Vanaf deze datum moeten nieuwe opdrachtgevers ook eerst hun account
// "starten" (kaart vastleggen via €0-abo met 30 dagen proef). Bestaande
// opdrachtgevers (aangemaakt vóór deze datum) blijven ongemoeid.
const CLIENT_SUBSCRIPTION_CUTOFF = new Date("2026-06-10T00:00:00Z");

export function RequireSubscription({ children, action = "deze functie" }: Props) {
  const { user, role, isAdmin } = useAuth();
  const { isActive, loading } = useSubscription();
  const [profileCreatedAt, setProfileCreatedAt] = useState<Date | null>(null);
  const [profileLoading, setProfileLoading] = useState(role === "opdrachtgever");

  useEffect(() => {
    let cancelled = false;
    if (role !== "opdrachtgever" || !user) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const createdAt = (data as { created_at?: string } | null)?.created_at;
        setProfileCreatedAt(createdAt ? new Date(createdAt) : null);
        setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [user, role]);

  if (loading || profileLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-brass-deep/80">Laden…</div>;
  }
  if (isAdmin || isActive) return <>{children}</>;

  // Begeleider: altijd abo verplicht.
  // Opdrachtgever: abo verplicht voor accounts aangemaakt vanaf cutoff-datum.
  let requiresSub = role === "begeleider";
  if (role === "opdrachtgever") {
    requiresSub = !profileCreatedAt || profileCreatedAt >= CLIENT_SUBSCRIPTION_CUTOFF;
  }
  if (!requiresSub) return <>{children}</>;

  const isClient = role === "opdrachtgever";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-card shadow-etched p-10 text-center space-y-5">
          <h1 className="font-display text-3xl text-brass-deep">Account activeren</h1>
          <p className="text-brass-deep/70">
            Je moet je account eerst activeren om {action} te gebruiken.
          </p>
          <p className="text-sm text-brass-deep/80">
            {isClient ? (
              <>
                <strong>30 dagen gratis proberen</strong> — daarna €0/maand.
                We leggen alleen je betaalkaart vast voor de 2-wekelijkse
                platformfactuur (€2,50 per geboekte begeleider).
              </>
            ) : (
              <><strong>30 dagen gratis proberen</strong> — maandelijks opzegbaar.</>
            )}
          </p>
          <Link
            to="/abonnement"
            className="inline-block px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
          >
            {isClient ? "Account activeren" : "Start 30 dagen gratis"}
          </Link>
          <p className="text-xs text-brass-deep/80">
            Vragen?{" "}
            <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
              support@viacust.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
