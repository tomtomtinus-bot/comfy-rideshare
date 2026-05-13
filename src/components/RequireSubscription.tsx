import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

interface Props {
  children: React.ReactNode;
  /** Wat de gebruiker probeert te doen (voor de melding) */
  action?: string;
}

export function RequireSubscription({ children, action = "deze functie" }: Props) {
  const { role, isAdmin } = useAuth();
  const { isActive, loading } = useSubscription();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-brass-deep/50">Laden…</div>;
  }
  if (isAdmin || isActive) return <>{children}</>;
  if (role !== "begeleider" && role !== "opdrachtgever") return <>{children}</>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-card shadow-etched p-10 text-center space-y-5">
          <h1 className="font-display text-3xl text-brass-deep">Abonnement vereist</h1>
          <p className="text-brass-deep/70">
            Je hebt een actief abonnement nodig om {action} te gebruiken.
          </p>
          <p className="text-sm text-brass-deep/60">
            <strong>30 dagen gratis proberen</strong> — opzegbaar tijdens de proefperiode.
          </p>
          <Link
            to="/abonnement"
            className="inline-block px-6 py-3 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
          >
            Start 30 dagen gratis
          </Link>
          <p className="text-xs text-brass-deep/50">
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
