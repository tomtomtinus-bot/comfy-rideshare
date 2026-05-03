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

const COUNTRY_CERTS = [
  { id: "nl", label: "Nederland" },
  { id: "be-1", label: "België type 1" },
  { id: "be-2", label: "België type 2" },
  { id: "de", label: "Duitsland" },
  { id: "fr", label: "Frankrijk" },
] as const;

const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] as const;

const schema = z.object({
  baseCity: z.string().min(1),
  baseAddress: z.string().trim().min(3, "Vul straat + huisnummer in").max(160),
  basePostcode: z.string().trim().min(4, "Vul postcode in").max(12),
  hourlyRate: z.coerce.number().min(15).max(200).multipleOf(0.01),
  vehicleType: z.string().trim().min(2).max(120),
  certNumber: z.string().trim().max(60).optional().or(z.literal("")),
  certExpiresOn: z.string().optional().or(z.literal("")),
  vcaNumber: z.string().trim().max(60).optional().or(z.literal("")),
  insurancePolicy: z.string().trim().max(120).optional().or(z.literal("")),
});

interface AvailSlot {
  id?: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

const Inner = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [available, setAvailable] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hp, setHp] = useState(true);
  const [lb, setLb] = useState(true);
  const [ks, setKs] = useState(true);
  const [files, setFiles] = useState<string[]>([]);
  const [slots, setSlots] = useState<AvailSlot[]>([]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [{ data: p }, { data: av }] = await Promise.all([
        supabase.from("escort_profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("escort_availability").select("*").eq("escort_id", user.id).order("weekday"),
      ]);
      if (p) {
        setProfile(p);
        setCategories((p as any).categories ?? []);
        setAvailable(p.available);
        setHp(p.vehicle_has_height_pole);
        setLb(p.vehicle_has_lightbar);
        setKs(p.vehicle_has_konvooi_sign);
        setFiles(((p as any).certificate_files ?? []) as string[]);
      }
      if (av) setSlots(av.map((a: any) => ({ id: a.id, weekday: a.weekday, start_time: a.start_time.slice(0,5), end_time: a.end_time.slice(0,5) })));
      setLoading(false);
    })();
  }, [user]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const f = e.target.files[0];
    if (f.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("escort-certificates").upload(path, f);
    if (error) return toast.error(error.message);
    setFiles((s) => [...s, path]);
    toast.success("Certificaat geüpload");
    e.target.value = "";
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from("escort-certificates").remove([path]);
    setFiles((s) => s.filter((p) => p !== path));
  };

  const addSlot = () => setSlots((s) => [...s, { weekday: 0, start_time: "08:00", end_time: "17:00" }]);
  const updateSlot = (i: number, patch: Partial<AvailSlot>) =>
    setSlots((s) => s.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)));
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      baseCity: fd.get("baseCity"),
      baseAddress: fd.get("baseAddress"),
      basePostcode: fd.get("basePostcode"),
      hourlyRate: fd.get("hourlyRate"),
      vehicleType: fd.get("vehicleType"),
      certNumber: fd.get("certNumber") ?? "",
      certExpiresOn: fd.get("certExpiresOn") ?? "",
      vcaNumber: fd.get("vcaNumber") ?? "",
      insurancePolicy: fd.get("insurancePolicy") ?? "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (categories.length === 0) return toast.error("Kies minimaal één land/certificering");

    const geo = geocode(parsed.data.baseCity);
    if (!geo) return toast.error("Standplaats niet herkend");

    setBusy(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({
        base_city: geo.city,
        base_lat: geo.lat,
        base_lng: geo.lng,
        base_address: parsed.data.baseAddress,
        base_postcode: parsed.data.basePostcode,
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
        certificate_files: files,
        available,
      })
      .eq("id", user.id);

    // Replace availability
    await supabase.from("escort_availability").delete().eq("escort_id", user.id);
    if (slots.length > 0) {
      await supabase.from("escort_availability").insert(
        slots.map((s) => ({
          escort_id: user.id,
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      );
    }

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
                <Input name="hourlyRate" type="number" step="0.01" label="Uurtarief (€)" defaultValue={String(profile?.hourly_rate ?? 55)} />
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
                <Label>Landen gecertificeerd</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTRY_CERTS.map((c) => (
                    <Toggle key={c.id} on={categories.includes(c.id)} onClick={() => setCategories((s) => toggle(s, c.id))}>
                      {c.label}
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
                <Label>Certificaten (uploads)</Label>
                <div className="mt-2 space-y-2">
                  {files.map((p) => (
                    <div key={p} className="flex items-center justify-between bg-parchment border border-brass-deep/15 px-3 py-2 text-xs">
                      <span className="truncate">{p.split("/").pop()}</span>
                      <button type="button" onClick={() => removeFile(p)} className="text-brass-deep/60 hover:text-brass-deep uppercase tracking-widest">
                        Verwijder
                      </button>
                    </div>
                  ))}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleUpload}
                    className="text-xs text-brass-deep/70 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-brass-deep file:text-parchment file:uppercase file:tracking-widest file:text-[10px] file:font-semibold"
                  />
                  <p className="text-[10px] text-brass-deep/50">PDF/JPG/PNG · max 10 MB</p>
                </div>
              </div>

              <div>
                <Label>Wekelijkse beschikbaarheid</Label>
                <div className="mt-2 space-y-2">
                  {slots.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={s.weekday}
                        onChange={(e) => updateSlot(i, { weekday: Number(e.target.value) })}
                        className="bg-parchment border border-brass-deep/15 px-2 py-2 text-xs"
                      >
                        {WEEKDAYS.map((d, idx) => (
                          <option key={idx} value={idx}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={s.start_time}
                        onChange={(e) => updateSlot(i, { start_time: e.target.value })}
                        className="bg-parchment border border-brass-deep/15 px-2 py-2 text-xs"
                      />
                      <span className="text-brass-deep/50">–</span>
                      <input
                        type="time"
                        value={s.end_time}
                        onChange={(e) => updateSlot(i, { end_time: e.target.value })}
                        className="bg-parchment border border-brass-deep/15 px-2 py-2 text-xs"
                      />
                      <button type="button" onClick={() => removeSlot(i)} className="ml-auto text-brass-deep/60 hover:text-brass-deep text-xs uppercase tracking-widest">
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addSlot} className="text-xs uppercase tracking-widest font-semibold text-brass-deep border border-brass-deep/30 px-3 py-2 hover:bg-brass-deep hover:text-parchment transition-colors">
                    + Tijdvak toevoegen
                  </button>
                </div>
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
  step,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  step?: string;
}) => (
  <div>
    <Label>{label}</Label>
    <input
      name={name}
      type={type}
      step={step}
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
