import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

const RolePicker = () => {
  const { user, roles, loading, refreshApproval } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"opdrachtgever" | "begeleider">("opdrachtgever");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    const meta = (user.user_metadata ?? {}) as Record<string, string>;
    setFullName(meta.full_name || meta.name || "");
    setPhone(meta.phone || "");
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brass-deep/50 text-sm uppercase tracking-widest">
        Laden…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (roles.length > 0) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) return toast.error("Vul je naam in");
    if (!phone.trim() || phone.trim().length < 6) return toast.error("Vul een geldig telefoonnummer in");
    if (!acceptedTerms) return toast.error("Accepteer de algemene voorwaarden");
    if (!acceptedPrivacy) return toast.error("Accepteer de privacyverklaring");

    setBusy(true);
    try {
      const { error: roleErr } = await supabase.rpc("claim_initial_role", { _role: role });
      if (roleErr) throw roleErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          terms_accepted_at: new Date().toISOString(),
          privacy_accepted_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (profErr) throw profErr;

      if (role === "begeleider") {
        await supabase.from("escort_profiles").insert({
          id: user.id,
          base_city: "Utrecht",
          base_lat: 52.0907,
          base_lng: 5.1214,
          hourly_rate: 35,
        });
      }

      await refreshApproval();
      toast.success("Account ingesteld");
      // Force a reload so useAuth re-fetches roles cleanly
      window.location.href = "/dashboard";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Opslaan mislukt";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-md mx-auto bg-card shadow-etched p-8 md:p-10">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Account afronden
          </p>
          <h1 className="font-display text-4xl text-brass-deep italic mb-2">
            Welkom bij ViaCust
          </h1>
          <p className="text-sm text-brass-deep/60 mb-8">
            Kies hoe je ViaCust gaat gebruiken en vul je gegevens aan.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-px bg-brass-deep/10 p-px">
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

            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                Volledige naam
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                Telefoon
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>

            {role === "begeleider" && (
              <p className="text-xs text-brass-deep/65 leading-relaxed bg-parchment/60 p-3 border-l-2 border-brass-gold">
                Je kunt later in je profiel je standplaats, uurtarief en beschikbaarheid instellen.
              </p>
            )}

            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 text-xs text-brass-deep/80 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 accent-brass-deep"
                />
                <span>
                  Ik ga akkoord met de{" "}
                  <Link to="/voorwaarden" target="_blank" className="text-brass-gold underline hover:text-brass-deep">
                    Algemene Voorwaarden
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
                  <Link to="/privacy" target="_blank" className="text-brass-gold underline hover:text-brass-deep">
                    privacyverklaring
                  </Link>
                  .
                </span>
              </label>
            </div>

            <button
              disabled={busy}
              className="w-full mt-6 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy ? "Bezig…" : "Doorgaan"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RolePicker;
