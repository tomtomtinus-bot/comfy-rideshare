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
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [pendingPassword, setPendingPassword] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;

    const finish = (ok: boolean, msg?: string) => {
      if (cancelled) return;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (ok) {
        console.info("Password recovery ready", {
          search: window.location.search,
          hashKeys: window.location.hash ? Array.from(new URLSearchParams(window.location.hash.slice(1)).keys()) : [],
        });
        setError(null);
        setReady(true);
      } else {
        console.warn("Password recovery not ready", {
          message: msg,
          search: window.location.search,
          hash: window.location.hash,
        });
        setReady(false);
        setError(msg ?? "Herstellink ongeldig of verlopen. Vraag een nieuwe aan.");
      }
    };

    const waitForRecoverySession = async (attempt = 0) => {
      const { data } = await supabase.auth.getSession();
      if (data.session) return finish(true);
      if (attempt >= 12) return finish(false);
      retryTimer = window.setTimeout(() => waitForRecoverySession(attempt + 1), 300);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) finish(true);
    });

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

    // 2) Direct recovery token from the email template. This avoids the
    // redirect/hash race where the auth client logs in but this page misses it.
    const tokenHash = search.get("token_hash") || hash.get("token_hash");
    const type = search.get("type") || hash.get("type");
    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
        if (error) {
          console.warn("verifyOtp recovery failed", { message: error.message, name: error.name });
          waitForRecoverySession();
        } else {
          window.history.replaceState(window.history.state, "", "/reset-password");
          finish(true);
        }
      });
      return;
    }

    // 3) PKCE flow: ?code=...
    const code = search.get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) waitForRecoverySession();
        else finish(true);
      });
      return;
    }

    // 4) Implicit flow: #access_token=...&type=recovery
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

    // 5) The Supabase client can consume the recovery URL before this page renders.
    // Give that async session handoff a moment instead of immediately marking the link invalid.
    waitForRecoverySession();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
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
    if (error) {
      const msg = error.message || "";
      if (/AAL2|MFA|assurance/i.test(msg)) {
        // User has MFA enabled — require TOTP challenge before allowing password update.
        const { data: list } = await supabase.auth.mfa.listFactors();
        const verified = (list?.totp ?? []).find((f: any) => f.status === "verified");
        if (verified) {
          setMfaFactorId(verified.id);
          setPendingPassword(password);
          setNeedsMfa(true);
          setBusy(false);
          return;
        }
      }
      setBusy(false);
      return toast.error(msg);
    }
    setBusy(false);
    toast.success("Wachtwoord bijgewerkt.");
    navigate("/dashboard");
  };

  const onVerifyMfa = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!mfaFactorId || !pendingPassword) return;
    if (mfaCode.length < 6) return toast.error("Voer de 6-cijferige code in.");
    setBusy(true);
    const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode,
    });
    if (vErr) {
      setBusy(false);
      return toast.error(vErr.message);
    }
    const { error: uErr } = await supabase.auth.updateUser({ password: pendingPassword });
    setBusy(false);
    if (uErr) return toast.error(uErr.message);
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
          ) : needsMfa ? (
            <form onSubmit={onVerifyMfa} className="space-y-4">
              <p className="text-sm text-brass-deep/70">
                Tweestapsverificatie is actief op dit account. Voer de 6-cijferige code uit je authenticator-app in om je nieuwe wachtwoord op te slaan.
              </p>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Verificatiecode</label>
                <input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm tracking-[0.5em] text-center focus:outline-none focus:border-brass-gold"
                />
              </div>
              <button disabled={busy} className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
                {busy ? "Bezig…" : "Bevestigen & opslaan"}
              </button>
            </form>
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
