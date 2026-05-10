import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { GoogleCalendarCard } from "@/components/site/GoogleCalendarCard";

const COUNTRY_CERTS = [
  { id: "nl", label: "Nederland" },
  { id: "be-1", label: "België type 1" },
  { id: "be-2", label: "België type 2" },
  { id: "de", label: "Duitsland" },
  { id: "fr", label: "Frankrijk" },
] as const;

const schema = z.object({
  baseAddress: z.string().trim().min(3, "Vul straat + huisnummer in").max(160),
  basePostcode: z.string().trim().min(4, "Vul postcode in").max(12),
  baseCity: z.string().trim().min(1, "Plaats kon niet worden bepaald"),
  hourlyRate: z.coerce.number().min(15).max(200).multipleOf(0.01),
  hourlyRateBe: z.coerce.number().min(15).max(200).multipleOf(0.01),
  minBillableHours: z.coerce.number().min(0).max(24).multipleOf(0.25),
  vehicleType: z.string().trim().min(2).max(120),
  certNumber: z.string().trim().max(60).optional().or(z.literal("")),
  certExpiresOn: z.string().optional().or(z.literal("")),
  insurancePolicy: z.string().trim().max(120).optional().or(z.literal("")),
});

interface RideItem {
  id: string;
  scheduled_at: string;
  pickup_city: string;
  dropoff_city: string;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const niceDay = (d: Date) =>
  d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

// Simple postcode geocoder using free zippopotam API
async function lookupPostcode(postcode: string, country: "nl" | "be" | "de" | "fr" = "nl") {
  const raw = postcode.replace(/\s+/g, "").toUpperCase();
  // Zippopotam verwacht voor NL alleen de 4 cijfers (geen letters)
  const candidates: string[] = [];
  if (country === "nl") {
    const digits = raw.match(/^\d{4}/)?.[0];
    if (digits) candidates.push(digits);
    candidates.push(raw);
  } else {
    candidates.push(raw);
  }
  for (const code of candidates) {
    try {
      const res = await fetch(`https://api.zippopotam.us/${country}/${code}`);
      if (!res.ok) continue;
      const data = await res.json();
      const place = data.places?.[0];
      if (!place) continue;
      return {
        city: place["place name"] as string,
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
      };
    } catch {
      // try next
    }
  }
  return null;
}

function detectCountry(postcode: string): "nl" | "be" | "de" | "fr" {
  const c = postcode.replace(/\s+/g, "");
  if (/^\d{4}[A-Za-z]{2}$/.test(c)) return "nl";
  if (/^\d{4}$/.test(c)) return "be";
  if (/^\d{5}$/.test(c)) return "de";
  return "nl";
}

const Inner = () => {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const [categories, setCategories] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [surcharges, setSurcharges] = useState<{ label: string; amount: string; unit: "per_uur" | "percent" }[]>([]);
  const [fuel, setFuel] = useState<{
    enabled: boolean;
    kind: "per_uur" | "percent";
    tiers: { from: string; to: string; value: string }[];
  }>({ enabled: false, kind: "per_uur", tiers: [{ from: "0", to: "1.60", value: "0" }] });
  const [fuelParsing, setFuelParsing] = useState(false);
  const [currentFuel, setCurrentFuel] = useState<{ week_start: string; eur_per_liter: number } | null>(null);

  // Postcode autodetect
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  // Ritten op de planner-kaart (alleen voor weergave elders)
  const [rides, setRides] = useState<Record<string, RideItem>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;

      const [{ data: p }, { data: assigns }, { data: fp }] = await Promise.all([
        supabase.from("escort_profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("ride_assignments")
          .select("status, ride_id, rides(id, scheduled_at, pickup_city, dropoff_city)")
          .eq("escort_id", user.id)
          .in("status", ["accepted", "invited"]),
        supabase
          .from("weekly_fuel_prices")
          .select("week_start, eur_per_liter")
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (fp) setCurrentFuel(fp as any);

      if (p) {
        setProfile(p);
        setCategories(((p as any).categories ?? []) as string[]);
        setFiles(((p as any).certificate_files ?? []) as string[]);
        setSurcharges((((p as any).surcharges ?? []) as any[]).map((s) => ({
          label: String(s.label ?? ""),
          amount: String(s.amount ?? ""),
          unit: s.unit === "percent" ? "percent" : "per_uur",
        })));
        const fs = (p as any).fuel_surcharge ?? {};
        setFuel({
          enabled: !!fs.enabled,
          kind: fs.kind === "percent" ? "percent" : "per_uur",
          tiers: Array.isArray(fs.tiers) && fs.tiers.length > 0
            ? fs.tiers.map((t: any) => ({
                from: String(t.from ?? "0"),
                to: t.to == null ? "" : String(t.to),
                value: String(t.value ?? "0"),
              }))
            : [{ from: "0", to: "1.60", value: "0" }],
        });
        setPostcode((p as any).base_postcode ?? "");
        setCity(p.base_city ?? "");
        if (p.base_lat && p.base_lng) setCoords({ lat: p.base_lat, lng: p.base_lng });
      }

      if (assigns) {
        const map: Record<string, RideItem> = {};
        assigns.forEach((a: any) => {
          if (a.rides) {
            const k = ymd(new Date(a.rides.scheduled_at));
            map[k] = a.rides;
          }
        });
        setRides(map);
      }

      setLoading(false);
    })();
  }, [user]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const onPostcodeBlur = async () => {
    if (!postcode || postcode.length < 4) return;
    setLookupBusy(true);
    const c = await lookupPostcode(postcode, detectCountry(postcode));
    setLookupBusy(false);
    if (c) {
      setCity(c.city);
      setCoords({ lat: c.lat, lng: c.lng });
    } else {
      toast.error("Postcode niet gevonden");
    }
  };

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

  const days = useMemo(() => {
    const arr: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const num = (k: string, fallback = "") => {
      const v = fd.get(k);
      const s = v == null ? "" : String(v).trim();
      return s === "" ? fallback : s;
    };
    const parsed = schema.safeParse({
      baseAddress: fd.get("baseAddress"),
      basePostcode: postcode,
      baseCity: city,
      hourlyRate: num("hourlyRate", "0"),
      hourlyRateBe: num("hourlyRateBe", "0"),
      minBillableHours: num("minBillableHours", "0"),
      vehicleType: fd.get("vehicleType"),
      certNumber: fd.get("certNumber") ?? "",
      certExpiresOn: fd.get("certExpiresOn") ?? "",
      insurancePolicy: fd.get("insurancePolicy") ?? "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!coords) return toast.error("Locatie niet bepaald — controleer postcode");
    if (categories.length === 0) return toast.error("Kies minimaal één land/certificering");

    setBusy(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({
        base_city: parsed.data.baseCity,
        base_lat: coords.lat,
        base_lng: coords.lng,
        base_address: parsed.data.baseAddress,
        base_postcode: parsed.data.basePostcode,
        hourly_rate: parsed.data.hourlyRate,
        hourly_rate_be: parsed.data.hourlyRateBe,
        min_billable_hours: parsed.data.minBillableHours,
        vehicle_type: parsed.data.vehicleType,
        cert_number: parsed.data.certNumber || null,
        cert_expires_on: parsed.data.certExpiresOn || null,
        insurance_policy: parsed.data.insurancePolicy || null,
        categories,
        certificate_files: files,
        surcharges: surcharges.filter((s) => s.label.trim() && !/brandstof|fuel/i.test(s.label)).map((s) => ({ label: s.label.trim(), amount: s.amount.trim(), unit: s.unit })) as any,
        fuel_surcharge: {
          enabled: fuel.enabled,
          kind: fuel.kind,
          tiers: fuel.tiers
            .filter((t) => t.from !== "" || t.to !== "" || t.value !== "")
            .map((t) => ({
              from: Number(t.from) || 0,
              to: t.to === "" ? null : Number(t.to),
              value: Number(t.value) || 0,
            })),
        } as any,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) return toast.error(error.message);
    setDirty(false);
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
            <>
              <GoogleCalendarCard />
              <form
              onSubmit={save}
              onInput={() => setDirty(true)}
              onChange={() => setDirty(true)}
              className="bg-card shadow-etched p-8 md:p-10 space-y-8"
            >
              <section className="space-y-3">
                <p className="text-[11px] text-brass-deep/60">
                  Vul je <strong>exacte standplaats</strong> in. Opdrachtgevers zien alleen de plaats/regio; het volledige adres wordt enkel gebruikt om aan- en afrijtijden te berekenen.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input name="baseAddress" label="Straat + huisnummer" defaultValue={profile?.base_address ?? ""} />
                  <div>
                    <Label>Postcode</Label>
                    <input
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      onBlur={onPostcodeBlur}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                    <p className="text-[10px] text-brass-deep/50 mt-1">
                      {lookupBusy ? "Locatie ophalen…" : city ? `Plaats: ${city}` : "Plaats wordt automatisch bepaald"}
                    </p>
                  </div>
                  <Input name="hourlyRate" type="number" step="0.01" label="Uurtarief NL (€)" defaultValue={String(profile?.hourly_rate ?? 55)} />
                  <Input name="hourlyRateBe" type="number" step="0.01" label="Uurtarief België (€)" defaultValue={String((profile as any)?.hourly_rate_be ?? profile?.hourly_rate ?? 55)} />
                  <Input name="minBillableHours" type="number" step="0.25" label="Minimumtarief (uren) — 0 = geen minimum" defaultValue={String((profile as any)?.min_billable_hours ?? 0)} />
                  <Input
                    name="vehicleType"
                    label="Pilotvoertuig (type & kenmerk)"
                    defaultValue={profile?.vehicle_type ?? ""}
                  />
                </div>
              </section>

              <section>
                <Label>Landen gecertificeerd</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTRY_CERTS.map((c) => (
                    <Toggle key={c.id} on={categories.includes(c.id)} onClick={() => setCategories((s) => toggle(s, c.id))}>
                      {c.label}
                    </Toggle>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="certNumber" label="Certificaat verkeersregelaar (nr.)" defaultValue={profile?.cert_number ?? ""} />
                <Input name="certExpiresOn" type="date" label="Certificaat geldig tot" defaultValue={profile?.cert_expires_on ?? ""} />
                <Input name="insurancePolicy" label="Aansprakelijkheidsverzekering (polisnr.)" defaultValue={profile?.insurance_policy ?? ""} />
              </section>

              <section>
                <Label>Brandstoftoeslag (staffel)</Label>
                <p className="text-[11px] text-brass-deep/60 mt-1 mb-3">
                  Wordt automatisch berekend op basis van de gemiddelde Nederlandse dieselprijs (CBS) van de gefactureerde week.
                  {currentFuel && (
                    <> Huidige weekprijs: <strong>€{Number(currentFuel.eur_per_liter).toFixed(3)}/l</strong> (week {currentFuel.week_start}).</>
                  )}
                </p>
                <label className="flex items-center gap-2 mb-3 text-sm">
                  <input
                    type="checkbox"
                    checked={fuel.enabled}
                    onChange={(e) => setFuel((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  Brandstoftoeslag toepassen op mijn facturen
                </label>
                {fuel.enabled && (
                  <div className="mb-3 p-3 bg-parchment border border-brass-deep/15">
                    <p className="text-[11px] text-brass-deep/70 mb-2">
                      <strong>Staffel-PDF uploaden?</strong> Wij lezen de tiers automatisch uit en vullen de tabel hieronder in. Controleer altijd het resultaat.
                    </p>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={fuelParsing}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error("PDF mag max 10 MB zijn");
                          return;
                        }
                        setFuelParsing(true);
                        try {
                          const path = `${user.id}/staffel-${Date.now()}.pdf`;
                          const { error: upErr } = await supabase.storage
                            .from("fuel-staffels")
                            .upload(path, file, { contentType: file.type, upsert: true });
                          if (upErr) throw upErr;
                          const buf = await file.arrayBuffer();
                          let bin = "";
                          const bytes = new Uint8Array(buf);
                          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                          const b64 = btoa(bin);
                          const { data, error } = await supabase.functions.invoke("parse-fuel-staffel", {
                            body: { pdf_base64: b64, mime_type: file.type || "application/pdf" },
                          });
                          if (error) throw error;
                          if (!data?.tiers || data.tiers.length === 0) {
                            toast.error("Geen geldige staffel gevonden in PDF");
                          } else {
                            setFuel((f) => ({
                              ...f,
                              kind: data.kind === "percent" ? "percent" : "per_uur",
                              tiers: data.tiers.map((t: any) => ({
                                from: String(t.from ?? 0),
                                to: t.to == null ? "" : String(t.to),
                                value: String(t.value ?? 0),
                              })),
                            }));
                            toast.success(`${data.tiers.length} drempels geladen — controleer hieronder`);
                          }
                        } catch (err: any) {
                          toast.error(err?.message || "PDF kon niet verwerkt worden");
                        } finally {
                          setFuelParsing(false);
                          e.target.value = "";
                        }
                      }}
                      className="text-xs text-brass-deep/70 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-brass-deep file:text-parchment file:uppercase file:tracking-widest file:text-[10px] file:font-semibold disabled:opacity-50"
                    />
                    {fuelParsing && <p className="text-[11px] text-brass-gold mt-2">PDF wordt uitgelezen…</p>}
                  </div>
                )}
                {fuel.enabled && (
                  <>
                    <div className="flex gap-2 mb-2 text-sm">
                      <span className="text-brass-deep/60">Toeslag-eenheid:</span>
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={fuel.kind === "per_uur"} onChange={() => setFuel((f) => ({ ...f, kind: "per_uur" }))} /> € per uur
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={fuel.kind === "percent"} onChange={() => setFuel((f) => ({ ...f, kind: "percent" }))} /> % van uurtarief
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold">
                        <div className="col-span-4">Dieselprijs vanaf (€/l)</div>
                        <div className="col-span-4">tot (€/l, leeg = ∞)</div>
                        <div className="col-span-3">{fuel.kind === "percent" ? "% uurtarief" : "€ / uur"}</div>
                      </div>
                      {fuel.tiers.map((t, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2">
                          <input value={t.from} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, from: e.target.value } : x) }))} placeholder="0" className="col-span-4 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <input value={t.to} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, to: e.target.value } : x) }))} placeholder="∞" className="col-span-4 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <input value={t.value} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))} placeholder="0" className="col-span-3 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <button type="button" onClick={() => setFuel((f) => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))} className="col-span-1 px-2 py-2 text-[10px] text-brass-deep/60 hover:text-brass-deep border border-brass-deep/15">×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setFuel((f) => ({ ...f, tiers: [...f.tiers, { from: "", to: "", value: "" }] }))} className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold border border-brass-deep/30 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors">
                        + Drempel toevoegen
                      </button>
                    </div>
                  </>
                )}
              </section>

              <section>
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
              </section>

              <section className="bg-brass-gold/5 border border-brass-gold/30 p-4">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-1">Beschikbaarheid</p>
                <p className="text-sm text-brass-deep/80">
                  Je beschikbaarheid loopt voortaan via <strong>Google Agenda</strong>. Plaats verlof,
                  persoonlijke afspraken of vakantie direct in je eigen agenda — de planner overslaat je
                  automatisch als je bezet bent (incl. reistijd heen en terug).
                </p>
              </section>

              <button
                disabled={busy}
                className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
              >
                {busy ? "Bezig…" : "Profiel opslaan"}
              </button>
            </form>
            </>
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
