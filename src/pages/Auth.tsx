import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { CITIES, geocode } from "@/lib/geo";

const CATEGORIES = ["cat-1", "cat-2", "cat-3"] as const;
const ESCORT_TYPES = ["vooroprijden", "achteroprijden", "voor+achterop", "kruispuntbegeleiding"] as const;

const signupSchema = z.object({
  email: z.string().trim().email("Ongeldig e-mailadres").max(255),
  password: z.string().min(8, "Minimaal 8 tekens").max(72),
  fullName: z.string().trim().min(2, "Naam vereist").max(100),
  phone: z.string().trim().min(6).max(30),
  role: z.enum(["opdrachtgever", "begeleider"]),
  baseCity: z.string().optional(),
  hourlyRate: z.coerce.number().min(15).max(200).optional(),
  vehicleType: z.string().trim().max(120).optional(),
  certNumber: z.string().trim().max(60).optional(),
  certExpiresOn: z.string().optional(),
  vcaNumber: z.string().trim().max(60).optional(),
  insurancePolicy: z.string().trim().max(120).optional(),
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
  const [categories, setCategories] = useState<string[]>(["cat-1"]);
  const [escortTypes, setEscortTypes] = useState<string[]>(["vooroprijden"]);
  const [busy, setBusy] = useState(false);

  const toggleVal = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

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
    const parsed = signupSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      fullName: fd.get("fullName"),
      phone: fd.get("phone"),
      role,
      baseCity: fd.get("baseCity"),
      hourlyRate: fd.get("hourlyRate"),
      vehicleType: fd.get("vehicleType"),
      certNumber: fd.get("certNumber"),
      certExpiresOn: fd.get("certExpiresOn"),
      vcaNumber: fd.get("vcaNumber"),
      insurancePolicy: fd.get("insurancePolicy"),
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
      meta.hourly_rate = d.hourlyRate ?? 55;
    }
    setBusy(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: meta },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }

    // Vul convoi-specifieke begeleidervelden bij na auto-aangemaakt escort_profile
    if (d.role === "begeleider" && signUpData.user) {
      await supabase
        .from("escort_profiles")
        .update({
          categories,
          escort_types: escortTypes,
          vehicle_type: d.vehicleType || "Bestelwagen",
          cert_number: d.certNumber || null,
          cert_expires_on: d.certExpiresOn || null,
          vca_number: d.vcaNumber || null,
          insurance_policy: d.insurancePolicy || null,
        })
        .eq("id", signUpData.user.id);
    }

    setBusy(false);
    toast.success("Account aangemaakt");
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
                <Field name="hourlyRate" type="number" label="Uurtarief (€)" defaultValue="35" />
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
