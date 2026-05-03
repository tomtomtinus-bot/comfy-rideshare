import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { CITIES, geocode } from "@/lib/geo";

const CATEGORIES = ["cat-1", "cat-2", "cat-3"] as const;
const ESCORT_TYPES = ["vooroprijden", "achteroprijden", "voor+achterop", "kruispuntbegeleiding"] as const;

const schema = z.object({
  baseCity: z.string().min(1),
  hourlyRate: z.coerce.number().min(15).max(200),
  vehicleType: z.string().trim().min(2).max(120),
  certNumber: z.string().trim().max(60).optional().or(z.literal("")),
  certExpiresOn: z.string().optional().or(z.literal("")),
  vcaNumber: z.string().trim().max(60).optional().or(z.literal("")),
  insurancePolicy: z.string().trim().max(120).optional().or(z.literal("")),
});

const Inner = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [escortTypes, setEscortTypes] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [profile, setProfile] = useState<{
    base_city: string;
    hourly_rate: number;
    vehicle_type: string;
    vehicle_has_height_pole: boolean;
    vehicle_has_lightbar: boolean;
    vehicle_has_konvooi_sign: boolean;
    cert_number: string | null;
    cert_expires_on: string | null;
    vca_number: string | null;
    insurance_policy: string | null;
    anonymous_id: string;
  } | null>(null);
  const [hp, setHp] = useState(true);
  const [lb, setLb] = useState(true);
  const [ks, setKs] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from("escort_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as never);
        setCategories(data.categories ?? []);
        setEscortTypes(data.escort_types ?? []);
        setAvailable(data.available);
        setHp(data.vehicle_has_height_pole);
        setLb(data.vehicle_has_lightbar);
        setKs(data.vehicle_has_konvooi_sign);
      }
      setLoading(false);
    })();
  }, [user]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      baseCity: fd.get("baseCity"),
      hourlyRate: fd.get("hourlyRate"),
      vehicleType: fd.get("vehicleType"),
      certNumber: fd.get("certNumber") ?? "",
      certExpiresOn: fd.get("certExpiresOn") ?? "",
      vcaNumber: fd.get("vcaNumber") ?? "",
      insurancePolicy: fd.get("insurancePolicy") ?? "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (categories.length === 0) return toast.error("Kies minimaal één categorie");
    if (escortTypes.length === 0) return toast.error("Kies minimaal één type begeleiding");

    const geo = geocode(parsed.data.baseCity);
    if (!geo) return toast.error("Standplaats niet herkend");

    setBusy(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({
        base_city: geo.city,
        base_lat: geo.lat,
        base_lng: geo.lng,
        hourly_rate: parsed.data.hourlyRate,
        vehicle_type: parsed.data.vehicleType,
        vehicle_has_height_pole: hp,
        vehicle_has_lightbar: lb,
        vehicle_has_konvooi_sign: ks,
        cert_number: parsed.data.certNumber || null,
        cert_expires_on: parsed.data.certExpiresOn || null,
        vca_number: parsed.data.vcaNumber || null,
        insurance_policy: parsed.data.insurancePolicy || null,
        categories,
        escort_types: escortTypes,
        available,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Profiel bijgewerkt");
    navigate("/dashboard");
  };

  if (!authLoading && role !== "begeleider") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main className="max-w-2xl mx-auto px-6 py-24">
          <p className="text-brass-deep/60">Deze pagina is alleen voor begeleiders.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-3xl mx-auto">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Begeleider {profile?.anonymous_id ? `#${profile.anonymous_id}` : ""}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic mb-10">
            Mijn profiel
          </h1>

          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : (
            <form onSubmit={save} className="bg-card shadow-etched p-8 md:p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Standplaats</Label>
                  <select
                    name="baseCity"
                    defaultValue={profile?.base_city}
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  >
                    {CITIES.map((c) => (
                      <option key={c.city} value={c.city}>
                        {c.city}, {c.country}
                      </option>
                    ))}
                  </select>
                </div>
                <Input name="hourlyRate" type="number" label="Uurtarief (€)" defaultValue={String(profile?.hourly_rate ?? 55)} />
              </div>

              <Input
                name="vehicleType"
                label="Pilotvoertuig (type & kenmerk)"
                defaultValue={profile?.vehicle_type ?? ""}
              />

              <div>
                <Label>Voertuiguitrusting</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Toggle on={hp} onClick={() => setHp(!hp)}>Hoogtepaal</Toggle>
                  <Toggle on={lb} onClick={() => setLb(!lb)}>Zwaailichtbalk</Toggle>
                  <Toggle on={ks} onClick={() => setKs(!ks)}>Konvooibord</Toggle>
                </div>
              </div>

              <div>
                <Label>Categorieën uitzonderlijk vervoer</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => (
                    <Toggle key={c} on={categories.includes(c)} onClick={() => setCategories((s) => toggle(s, c))}>
                      {c}
                    </Toggle>
                  ))}
                </div>
              </div>

              <div>
                <Label>Type begeleiding</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ESCORT_TYPES.map((t) => (
                    <Toggle key={t} on={escortTypes.includes(t)} onClick={() => setEscortTypes((s) => toggle(s, t))}>
                      {t}
                    </Toggle>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="certNumber" label="Certificaat verkeersregelaar (nr.)" defaultValue={profile?.cert_number ?? ""} />
                <Input name="certExpiresOn" type="date" label="Certificaat geldig tot" defaultValue={profile?.cert_expires_on ?? ""} />
                <Input name="vcaNumber" label="VCA-diploma nr." defaultValue={profile?.vca_number ?? ""} />
                <Input name="insurancePolicy" label="Aansprakelijkheidsverzekering (polisnr.)" defaultValue={profile?.insurance_policy ?? ""} />
              </div>

              <div>
                <Label>Beschikbaarheid</Label>
                <div className="mt-2">
                  <Toggle on={available} onClick={() => setAvailable(!available)}>
                    {available ? "Beschikbaar voor opdrachten" : "Niet beschikbaar"}
                  </Toggle>
                </div>
              </div>

              <button
                disabled={busy}
                className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
              >
                {busy ? "Bezig…" : "Profiel opslaan"}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{children}</label>
);

const Input = ({
  name,
  label,
  type = "text",
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
}) => (
  <div>
    <Label>{label}</Label>
    <input
      name={name}
      type={type}
      defaultValue={defaultValue}
      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
    />
  </div>
);

const Toggle = ({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-2 text-xs uppercase tracking-widest font-semibold border ${
      on ? "bg-brass-deep text-parchment border-brass-deep" : "bg-card text-brass-deep/70 border-brass-deep/15"
    }`}
  >
    {children}
  </button>
);

const EscortSettings = () => (
  <RequireAuth>
    <Inner />
  </RequireAuth>
);

export default EscortSettings;
