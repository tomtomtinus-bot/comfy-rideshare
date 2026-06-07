import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const AcceptInvitation = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const accept = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-company-invitation", {
        body: { token },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Accepteren mislukt");
      } else {
        toast.success("Welkom bij het bedrijf!");
        setDone(true);
        setTimeout(() => navigate("/dashboard"), 1200);
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!token) toast.error("Token ontbreekt in de uitnodiging-link");
  }, [token]);

  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <Nav />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full bg-white border border-brass-deep/10 p-8">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brass-deep/80 mb-2">Bedrijfsuitnodiging</p>
          <h1 className="font-display text-3xl text-brass-deep mb-4">
            {done ? "Aangesloten!" : "Word chauffeur"}
          </h1>
          {!token ? (
            <p className="text-sm text-brass-deep/70">Deze link is ongeldig of incompleet.</p>
          ) : loading ? (
            <p className="text-sm text-brass-deep/70">Laden…</p>
          ) : !user ? (
            <>
              <p className="text-sm text-brass-deep/70 mb-4">
                Log in of maak een account aan met het e-mailadres waarop je deze uitnodiging hebt
                ontvangen om door te gaan.
              </p>
              <Button
                onClick={() =>
                  navigate(`/auth?redirect=${encodeURIComponent(`/uitnodiging?token=${token}`)}`)
                }
                className="w-full"
              >
                Inloggen of registreren
              </Button>
            </>
          ) : done ? (
            <p className="text-sm text-brass-deep/70">
              Je bent gekoppeld aan het bedrijf. We sturen je door naar je dashboard…
            </p>
          ) : (
            <>
              <p className="text-sm text-brass-deep/70 mb-4">
                Je staat op het punt om als <strong>chauffeur</strong> te worden gekoppeld aan een
                bedrijf op ViaCust. Je gaat toegewezen ritten zien en kunt je uren indienen. De
                bedrijfsplanner blijft eindverantwoordelijk voor acceptatie en facturatie.
              </p>
              <p className="text-xs text-brass-deep/80 mb-6">
                Ingelogd als: <strong>{user.email}</strong>
              </p>
              <Button onClick={accept} disabled={submitting} className="w-full">
                {submitting ? <><Loader2 className="size-4 animate-spin mr-2" /> Bezig…</> : "Uitnodiging accepteren"}
              </Button>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AcceptInvitation;
