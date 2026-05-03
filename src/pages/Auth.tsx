import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CITIES, geocode } from "@/lib/geo";

const signupSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  password: z.string().min(8, "Minimaal 8 tekens").max(72),
  fullName: z.string().trim().min(2, "Naam vereist").max(100),
  phone: z.string().trim().min(6).max(30),
  role: z.enum(["opdrachtgever", "begeleider"]),
  baseCity: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"opdrachtgever" | "begeleider">("opdrachtgever");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
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
    navigate("/dashboard");
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
      baseCity: get("baseCity"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const d = parsed.data;
    const meta: Record<string, string | number> = {
      full_name: d.fullName,
      phone: d.phone,
      role: d.role,
    };
    if (d.role === "begeleider") {
      const geo = geocode(d.baseCity || "Utrecht");
      if (!geo) return toast.error("Standplaats niet herkend, kies een stad uit de lijst");
      meta.base_city = geo.city;
      meta.base_lat = geo.lat;
      meta.base_lng = geo.lng;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    setBusy(false);
    if (error) return toast.error(error.message);

    toast.success("Account aangemaakt — vul uw profiel aan in het dashboard");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            {mode === "login" ? "Inloggen" : "Registreer"}
          </p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-8">
            {mode === "login" ? "Welkom terug." : "Sluit u aan."}
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
                  {r === "opdrachtgever" ? "Opdrachtgever" : "Begeleider"}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field name="fullName" label="Volledige naam" required />
                <Field name="phone" label="Telefoon" required />
              </>
            )}
            <Field name="email" type="email" label="E-mail" required />
            <Field name="password" type="password" label="Wachtwoord" required />

            {mode === "signup" && role === "begeleider" && (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                    Standplaats (stad)
                  </label>
                  <select
                    name="baseCity"
                    required
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  >
                    {CITIES.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city}, {c.country}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-brass-deep/65 leading-relaxed bg-parchment/60 p-3 border-l-2 border-brass-gold">
                  Tarieven, voertuigspecificaties, certificaten en categorieën vult u na registratie in via uw persoonlijke profiel in het dashboard.
                </p>
              </>
            )}

            <button
              disabled={busy}
              className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy ? "Bezig…" : mode === "login" ? "Inloggen" : "Registreer"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 text-xs text-brass-deep/60 hover:text-brass-gold w-full text-center"
          >
            {mode === "login" ? "Nog geen account? Registreer" : "Al een account? Inloggen"}
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
