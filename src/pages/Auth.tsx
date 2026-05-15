import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { lovable } from "@/integrations/lovable";
import {
  biometricAvailable,
  hasStoredCredentials,
  saveBiometricCredentials,
  unlockWithBiometrics,
  isNative,
} from "@/lib/biometric";
import { isNativeApp, signInWithGoogleNative } from "@/lib/nativeGoogleAuth";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [role, setRole] = useState<"opdrachtgever" | "begeleider">("opdrachtgever");
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("viacust_remember") !== "false";
  });
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isNative()) return;
      const ok = (await biometricAvailable()) && (await hasStoredCredentials());
      setBioReady(ok);
    })();
  }, []);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  const signupSchema = z.object({
    email: z.string().trim().email(t("auth.err.invalidEmail")).max(255),
    password: z.string().min(8, t("auth.err.minPassword")).max(72),
    fullName: z.string().trim().min(2, t("auth.err.nameRequired")).max(100),
    phone: z.string().trim().min(6).max(30),
    role: z.enum(["opdrachtgever", "begeleider"]),
  });

  const loginSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(72),
  });

  const doSignIn = async (email: string, password: string) => {
    try {
      localStorage.setItem("viacust_remember", rememberMe ? "true" : "false");
      sessionStorage.setItem("viacust_session_active", "1");
    } catch {
      // ignore storage errors
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const error = await doSignIn(parsed.data.email, parsed.data.password);
    if (error) {
      setBusy(false);
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return toast.error("E-mailadres nog niet bevestigd. Check je inbox (en spam) voor de bevestigingslink.");
      }
      return toast.error(error.message);
    }
    // Bied biometrische opslag aan op native apparaten
    if (isNative() && (await biometricAvailable())) {
      if (confirm("Voortaan inloggen met vingerafdruk of Face ID?")) {
        try {
          await saveBiometricCredentials(parsed.data.email, parsed.data.password);
          toast.success("Biometrische login geactiveerd");
        } catch {
          // ignore
        }
      }
    }
    setBusy(false);
    navigate(redirectTo);
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    try {
      if (isNativeApp()) {
        // Native iOS/Android — gebruikt platform-specifieke OAuth client.
        await signInWithGoogleNative();
        setBusy(false);
        navigate(redirectTo);
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      setBusy(false);
      if (result.error) {
        toast.error(result.error.message || "Google-inloggen mislukt");
        return;
      }
      if (result.redirected) {
        // Browser redirect happens automatically
        return;
      }
      navigate(redirectTo);
    } catch (err) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : "Google-inloggen mislukt";
      toast.error(msg);
    }
  };

  const handleBiometricLogin = async () => {
    setBusy(true);
    const creds = await unlockWithBiometrics();
    if (!creds) {
      setBusy(false);
      return;
    }
    const error = await doSignIn(creds.email, creds.password);
    setBusy(false);
    if (error) return toast.error("Login mislukt — log opnieuw in met je wachtwoord.");
    navigate(redirectTo);
  };


  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => {
      const v = fd.get(k);
      return typeof v === "string" ? v : undefined;
    };
    const parsed = signupSchema.safeParse({
      email: get("email"),
      password: get("password"),
      fullName: get("fullName"),
      phone: get("phone"),
      role,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!acceptedTerms) {
      toast.error("Je moet de algemene voorwaarden accepteren om door te gaan.");
      return;
    }
    if (!acceptedPrivacy) {
      toast.error("Je moet de privacyverklaring accepteren om door te gaan.");
      return;
    }
    const d = parsed.data;
    const meta: Record<string, string | number> = {
      full_name: d.fullName,
      phone: d.phone,
      role: d.role,
      terms_accepted: "true",
      privacy_accepted: "true",
    };
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: { emailRedirectTo: `${window.location.origin}/abonnement`, data: meta },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    if (data.session) {
      toast.success(t("auth.accountCreated"));
      navigate("/dashboard");
    } else {
      toast.success("Check je e-mail! Klik op de bevestigingslink om je account te activeren.");
      setMode("login");
    }
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return toast.error("Ongeldig e-mailadres");
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Als dit e-mailadres bestaat, is er een herstellink verstuurd.");
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            {mode === "login" ? t("auth.login") : mode === "signup" ? t("auth.signup") : "Wachtwoord vergeten"}
          </p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-2">
            {mode === "login" ? t("auth.welcomeBack") : mode === "signup" ? t("auth.join") : "Herstel je toegang"}
          </h1>
          <p className="text-sm text-brass-deep/50 italic mb-8">
            {" "}
          </p>

          {mode === "signup" && (
            <div className="mb-6 grid grid-cols-2 gap-px bg-brass-deep/10 p-px">
              {(["opdrachtgever", "begeleider"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-3 text-xs uppercase tracking-widest font-semibold transition-colors ${
                    role === r ? "bg-brass-deep text-parchment" : "bg-card text-brass-deep/60"
                  }`}
                >
                  {r === "opdrachtgever" ? t("auth.client") : t("auth.escort")}
                </button>
              ))}
            </div>
          )}

          {mode === "forgot" ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <p className="text-xs text-brass-deep/70 leading-relaxed">
                Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord in te stellen.
              </p>
              <Field name="email" type="email" label={t("auth.email")} required />
              <button
                disabled={busy}
                className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
              >
                {busy ? t("auth.busy") : "Stuur herstellink"}
              </button>
            </form>
          ) : (
            <>
            {(mode === "login" || mode === "signup") && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="w-full mb-3 px-6 py-4 bg-white border border-gray-200 text-gray-700 uppercase tracking-widest text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-3"
                >
                  <svg className="size-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {mode === "signup" ? "Aanmelden met Google" : "Inloggen met Google"}
                </button>
                {mode === "signup" && (
                  <p className="text-[11px] text-brass-deep/60 mb-3 text-center">
                    Na aanmelden kies je of je opdrachtgever of begeleider bent.
                  </p>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-brass-deep/15" />
                  <span className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-semibold">of</span>
                  <div className="flex-1 h-px bg-brass-deep/15" />
                </div>
                {mode === "login" && bioReady && (
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={busy}
                    className="w-full mb-4 px-6 py-4 border-2 border-brass-deep text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-60"
                  >
                    🔒 Inloggen met vingerafdruk / Face ID
                  </button>
                )}
              </>
            )}
            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              {mode === "signup" && (
                <>
                  <Field name="fullName" label={t("auth.fullName")} required />
                  <Field name="phone" label={t("auth.phone")} required />
                </>
              )}
              <Field name="email" type="email" label={t("auth.email")} required />
              <Field name="password" type="password" label={t("auth.password")} required />

              {mode === "login" && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 text-xs text-brass-deep/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="accent-brass-deep"
                    />
                    <span>Blijf ingelogd</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-brass-gold hover:text-brass-deep underline"
                  >
                    Wachtwoord vergeten?
                  </button>
                </div>
              )}

              {mode === "signup" && role === "begeleider" && (
                <p className="text-xs text-brass-deep/65 leading-relaxed bg-parchment/60 p-3 border-l-2 border-brass-gold">
                  {t("auth.escortHint")}
                </p>
              )}

              {mode === "signup" && (
                <div className="space-y-2">
                  <label className="flex items-start gap-2 text-xs text-brass-deep/80 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 accent-brass-deep"
                    />
                    <span>
                      Ik ga akkoord met de{" "}
                      <Link to="/voorwaarden" target="_blank" rel="noopener noreferrer" className="text-brass-gold underline hover:text-brass-deep">
                        Algemene Voorwaarden
                      </Link>{" "}
                      en erken dat ViaCust uitsluitend optreedt als software-facilitator en nimmer aansprakelijk is voor de uitvoering of betaling van de ritten.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-brass-deep/80 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      className="mt-0.5 accent-brass-deep"
                    />
                    <span>
                      Ik ga akkoord met de{" "}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brass-gold underline hover:text-brass-deep">
                        privacyverklaring
                      </Link>
                      .
                    </span>
                  </label>
                </div>
              )}

              <button
                disabled={busy}
                className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
              >
                {busy ? t("auth.busy") : mode === "login" ? t("auth.login") : t("auth.signup")}
              </button>
            </form>
            </>
          )}

          <button
            onClick={() => setMode(mode === "forgot" ? "login" : mode === "login" ? "signup" : "login")}
            className="mt-6 text-xs text-brass-deep/60 hover:text-brass-gold w-full text-center"
          >
            {mode === "login" ? t("auth.noAccount") : mode === "signup" ? t("auth.hasAccount") : "Terug naar inloggen"}
          </button>
          <p className="mt-4 text-center text-[10px] text-brass-deep/40">
            Problemen?{" "}
            <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
              support@viacust.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Field = ({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
      {label}
    </label>
    <input
      name={name}
      type={type}
      required={required}
      defaultValue={defaultValue}
      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
    />
  </div>
);

export default Auth;
