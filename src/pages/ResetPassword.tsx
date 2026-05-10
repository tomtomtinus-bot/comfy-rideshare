import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean, msg?: string) => {
      if (cancelled) return;
      if (ok) setReady(true);
      else setError(msg ?? "Herstellink ongeldig of verlopen. Vraag een nieuwe aan.");
    };

    // 1) Errors in hash/query (e.g. expired link)
    const hash = window.location.hash.startsWith("#")
      ? new URLSearchParams(window.location.hash.slice(1))
      : new URLSearchParams();
    const search = new URLSearchParams(window.location.search);
    const errDesc = hash.get("error_description") || search.get("error_description");
    if (errDesc) {
      finish(false, decodeURIComponent(errDesc.replace(/\+/g, " ")));
      return;
    }

    // 2) PKCE flow: ?code=...
    const code = search.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) finish(false, error.message);
        else finish(true);
      });
      return;
    }

    // 3) Implicit flow: #access_token=...&type=recovery
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) finish(false, error.message);
          else finish(true);
        });
      return;
    }

    // 4) Already signed in (e.g. recovery already processed)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
      else finish(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") finish(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) return toast.error("Wachtwoord moet minimaal 8 tekens zijn.");
    if (password !== confirm) return toast.error("Wachtwoorden komen niet overeen.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Wachtwoord bijgewerkt.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">Wachtwoord</p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-8">Nieuw wachtwoord</h1>
          {error ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => navigate("/auth")}
                className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
              >
                Terug naar inloggen
              </button>
            </div>
          ) : !ready ? (
            <p className="text-sm text-brass-deep/70">Bezig met verifiëren van je herstellink…</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Nieuw wachtwoord</label>
                <input name="password" type="password" required minLength={8} className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Bevestig wachtwoord</label>
                <input name="confirm" type="password" required minLength={8} className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
              </div>
              <button disabled={busy} className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
                {busy ? "Bezig…" : "Wachtwoord opslaan"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResetPassword;
