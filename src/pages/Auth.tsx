import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"opdrachtgever" | "begeleider">("opdrachtgever");
  const [busy, setBusy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

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

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? "") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
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
    const { error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success(t("auth.accountCreated"));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            {mode === "login" ? t("auth.login") : t("auth.signup")}
          </p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-8">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.join")}
          </h1>

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

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field name="fullName" label={t("auth.fullName")} required />
                <Field name="phone" label={t("auth.phone")} required />
              </>
            )}
            <Field name="email" type="email" label={t("auth.email")} required />
            <Field name="password" type="password" label={t("auth.password")} required />

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
                    <Link
                      to="/voorwaarden"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brass-gold underline hover:text-brass-deep"
                    >
                      algemene voorwaarden
                    </Link>
                    .
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
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brass-gold underline hover:text-brass-deep"
                    >
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

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-xs text-brass-deep/60 hover:text-brass-gold w-full text-center"
          >
            {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}
          </button>
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
