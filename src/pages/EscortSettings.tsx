import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { EmailChangeCard } from "@/components/site/EmailChangeCard";
import { AccountDeletionCard } from "@/components/AccountDeletionCard";
import { NotificationPreferencesCard } from "@/components/site/NotificationPreferencesCard";
import { RequireAuth } from "@/components/site/RequireAuth";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { GoogleCalendarCard } from "@/components/site/GoogleCalendarCard";

const COUNTRY_CERTS = [
  { id: "nl", label: "Nederland", country: "Nederland" },
  { id: "be-1", label: "België type 1", country: "België" },
  { id: "be-2", label: "België type 2", country: "België" },
  { id: "de", label: "Duitsland", country: "Duitsland" },
  { id: "fr", label: "Frankrijk", country: "Frankrijk" },
  { id: "lu", label: "Luxemburg", country: "Luxemburg" },
  ] as const;

const LANGUAGES = [
  "Nederlands",
  "Engels",
  "Duits",
  "Frans",
  "Spaans",
  "Italiaans",
  "Pools",
  "Russisch",
] as const;

// Leid het countries-veld af uit de gekozen certificeringen
const countriesFromCategories = (cats: string[]): string[] => {
  const set = new Set<string>();
  for (const c of cats) {
    const found = COUNTRY_CERTS.find((cc) => cc.id === c);
    if (found) set.add(found.country);
  }
  return Array.from(set);
};

const schema = z.object({
  fullName: z.string().trim().min(2, "Vul je naam in").max(120),
  phone: z.string().trim().min(6, "Vul een telefoonnummer in").max(32),
  baseAddress: z.string().trim().min(3, "Vul straat + huisnummer in").max(160),
  basePostcode: z.string().trim().min(4, "Vul postcode in").max(12),
  baseCity: z.string().trim().min(1, "Plaats kon niet worden bepaald"),
  hourlyRate: z.coerce.number().min(15).max(200).multipleOf(0.01),
  hourlyRateBe: z.coerce.number().min(15).max(200).multipleOf(0.01),
  hourlyRateDe: z.coerce.number().min(15).max(200).multipleOf(0.01),
  hourlyRateFr: z.coerce.number().min(15).max(200).multipleOf(0.01),
  hourlyRateLu: z.coerce.number().min(15).max(200).multipleOf(0.01),
  kmRateDe: z.union([z.coerce.number().min(0).max(10), z.literal("")]).optional(),
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

// PDOK Locatieserver: NL postcode + huisnummer → straat, plaats, lat/lng
async function lookupAddressNL(postcode: string, huisnummer: string) {
  const pc = postcode.replace(/\s+/g, "").toUpperCase();
  const hn = huisnummer.trim();
  if (!pc || !hn) return null;
  try {
    const url = `https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?fq=type:adres&q=postcode:${encodeURIComponent(pc)}%20AND%20huisnummer:${encodeURIComponent(hn)}&rows=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data?.response?.docs?.[0];
    if (!doc) return null;
    const m = String(doc.centroide_ll ?? "").match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    return {
      street: doc.straatnaam as string,
      city: doc.woonplaatsnaam as string,
      lng: m ? parseFloat(m[1]) : null,
      lat: m ? parseFloat(m[2]) : null,
    };
  } catch {
    return null;
  }
}

// Fallback: alleen postcode → plaats + coords (BE/DE/FR via zippopotam)
async function lookupPostcode(postcode: string, country: "nl" | "be" | "de" | "fr" = "nl") {
  const raw = postcode.replace(/\s+/g, "").toUpperCase();
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

// Split "Straatnaam 12A" → { street: "Straatnaam", number: "12A" }
function splitAddress(addr: string): { street: string; number: string } {
  const s = (addr ?? "").trim();
  const m = s.match(/^(.*?)[\s,]+(\d+\s*[A-Za-z]?(?:[-/]\d+\s*[A-Za-z]?)?)\s*$/);
  if (m) return { street: m[1].trim(), number: m[2].replace(/\s+/g, "") };
  return { street: s, number: "" };
}

const Inner = () => {
  const { t } = useTranslation();
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
  const [languages, setLanguages] = useState<string[]>(["Nederlands"]);

  // Persoonlijk
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Adres autodetect
  const [postcode, setPostcode] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  // Ritten op de planner-kaart (alleen voor weergave elders)
  const [rides, setRides] = useState<Record<string, RideItem>>({});

  // Lokaal concept: bewaart wat de gebruiker invult, ook bij navigatie weg.
  const draftKey = user ? `escort-settings-draft:${user.id}` : null;
  const draftRef = useRef<Record<string, unknown>>({});
  const dv = (name: string, fallback: string) => {
    const v = draftRef.current[name];
    return v == null ? fallback : String(v);
  };
  const writeDraft = (patch: Record<string, unknown>) => {
    draftRef.current = { ...draftRef.current, ...patch };
    if (draftKey) {
      try { localStorage.setItem(draftKey, JSON.stringify(draftRef.current)); } catch { /* ignore */ }
    }
  };

  useEffect(() => {
    (async () => {
      if (!user) return;

      // Lees lokaal concept eerst (zodat dv() in inputs werkt)
      if (draftKey) {
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) draftRef.current = JSON.parse(raw) ?? {};
        } catch { /* ignore */ }
      }

      const [{ data: p }, { data: pp }, { data: assigns }, { data: fp }] = await Promise.all([
        supabase.from("escort_profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
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
      const d = draftRef.current;
      if (pp) {
        setFullName((d.fullName as string) ?? pp.full_name ?? "");
        setPhone((d.phone as string) ?? pp.phone ?? "");
      }

      if (p) {
        setProfile(p);
        setCategories((d.categories as string[]) ?? (((p as any).categories ?? []) as string[]));
        setFiles(((p as any).certificate_files ?? []) as string[]);
        setLanguages((d.languages as string[]) ?? (((p as any).languages ?? ["Nederlands"]) as string[]));
        setSurcharges(
          (d.surcharges as { label: string; amount: string; unit: "per_uur" | "percent" }[]) ??
            (((p as any).surcharges ?? []) as any[]).map((s) => ({
              label: String(s.label ?? ""),
              amount: String(s.amount ?? ""),
              unit: s.unit === "percent" ? "percent" : "per_uur",
            })),
        );
        const fs = (p as any).fuel_surcharge ?? {};
        setFuel(
          (d.fuel as typeof fuel) ?? {
            enabled: !!fs.enabled,
            kind: fs.kind === "percent" ? "percent" : "per_uur",
            tiers: Array.isArray(fs.tiers) && fs.tiers.length > 0
              ? fs.tiers.map((t: any) => ({
                  from: String(t.from ?? "0"),
                  to: t.to == null ? "" : String(t.to),
                  value: String(t.value ?? "0"),
                }))
              : [{ from: "0", to: "1.60", value: "0" }],
          },
        );
        setPostcode((d.postcode as string) ?? (p as any).base_postcode ?? "");
        setCity((d.city as string) ?? (p.base_city ?? ""));
        const split = splitAddress((p as any).base_address ?? "");
        setStreet((d.street as string) ?? split.street);
        setHouseNumber((d.houseNumber as string) ?? split.number);
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
  }, [user, draftKey]);

  // Bewaar controlled state continu in concept
  useEffect(() => {
    if (loading) return;
    writeDraft({
      fullName, phone, postcode, houseNumber, street, city,
      categories, languages, surcharges, fuel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullName, phone, postcode, houseNumber, street, city, categories, languages, surcharges, fuel, loading]);


  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const runAddressLookup = async () => {
    if (!postcode || postcode.length < 4) return;
    const country = detectCountry(postcode);
    setLookupBusy(true);
    if (country === "nl" && houseNumber.trim()) {
      const a = await lookupAddressNL(postcode, houseNumber);
      setLookupBusy(false);
      if (a) {
        setStreet(a.street);
        setCity(a.city);
        if (a.lat && a.lng) setCoords({ lat: a.lat, lng: a.lng });
        setDirty(true);
        return;
      }
      // fallback naar postcode-only lookup
    }
    const c = await lookupPostcode(postcode, country);
    setLookupBusy(false);
    if (c) {
      setCity(c.city);
      setCoords({ lat: c.lat, lng: c.lng });
      setDirty(true);
    } else {
      toast.error(t("escortSettings.addressNotFound"));
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.length) return;
    const f = e.target.files[0];
    if (f.size > 10 * 1024 * 1024) return toast.error(t("escortSettings.maxSize"));
    const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("escort-certificates").upload(path, f);
    if (error) return toast.error(error.message);
    setFiles((s) => [...s, path]);
    toast.success(t("escortSettings.certUploaded"));
    e.target.value = "";
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from("escort-certificates").remove([path]);
    setFiles((s) => s.filter((p) => p !== path));
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const num = (k: string, fallback = "") => {
      const v = fd.get(k);
      const s = v == null ? "" : String(v).trim();
      return s === "" ? fallback : s;
    };
    const composedAddress = [street.trim(), houseNumber.trim()].filter(Boolean).join(" ");
    const parsed = schema.safeParse({
      fullName,
      phone,
      baseAddress: composedAddress,
      basePostcode: postcode,
      baseCity: city,
      hourlyRate: num("hourlyRate", String(profile?.hourly_rate ?? 55)),
      hourlyRateBe: num("hourlyRateBe", String((profile as any)?.hourly_rate_be ?? profile?.hourly_rate ?? 55)),
      hourlyRateDe: num("hourlyRateDe", String((profile as any)?.hourly_rate_de ?? profile?.hourly_rate ?? 55)),
      hourlyRateFr: num("hourlyRateFr", String((profile as any)?.hourly_rate_fr ?? profile?.hourly_rate ?? 55)),
      hourlyRateLu: num("hourlyRateLu", String((profile as any)?.hourly_rate_lu ?? profile?.hourly_rate ?? 55)),
      kmRateDe: num("kmRateDe", ""),
      minBillableHours: num("minBillableHours", "0"),
      vehicleType: fd.get("vehicleType"),
      certNumber: fd.get("certNumber") ?? "",
      certExpiresOn: fd.get("certExpiresOn") ?? "",
      insurancePolicy: fd.get("insurancePolicy") ?? "",
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!coords) return toast.error(t("escortSettings.locationNotSet"));
    if (categories.length === 0) return toast.error(t("escortSettings.pickAtLeastOneCountry"));

    const derivedCountries = countriesFromCategories(categories);
    if (derivedCountries.length === 0) {
      return toast.error(t("escortSettings.pickAtLeastOneCountry"));
    }

    setBusy(true);
    const [{ error }, { error: pErr }] = await Promise.all([
      supabase
      .from("escort_profiles")
      .update({
        base_city: parsed.data.baseCity,
        base_lat: coords.lat,
        base_lng: coords.lng,
        base_address: parsed.data.baseAddress,
        base_postcode: parsed.data.basePostcode,
        hourly_rate: parsed.data.hourlyRate,
        hourly_rate_be: parsed.data.hourlyRateBe,
        hourly_rate_de: parsed.data.hourlyRateDe,
        hourly_rate_fr: parsed.data.hourlyRateFr,
        hourly_rate_lu: parsed.data.hourlyRateLu,
        km_rate_de:
          parsed.data.kmRateDe === "" || parsed.data.kmRateDe == null
            ? null
            : Number(parsed.data.kmRateDe),
        countries: derivedCountries,
        min_billable_hours: parsed.data.minBillableHours,
        vehicle_type: parsed.data.vehicleType,
        categories,
        languages: languages.length ? languages : ["Nederlands"],
        surcharges: surcharges.filter((s) => s.label.trim() && !/brandstof|fuel/i.test(s.label)).map((s) => ({ label: s.label.trim(), amount: s.amount.trim(), unit: s.unit })) as any,
        fuel_surcharge: ((): any => {
          const baseCountry = detectCountry(parsed.data.basePostcode || "");
          if (baseCountry === "be" || baseCountry === "fr") {
            return { enabled: false, kind: fuel.kind, tiers: [] };
          }
          return {
            enabled: fuel.enabled,
            kind: fuel.kind,
            tiers: fuel.tiers
              .filter((t) => t.from !== "" || t.to !== "" || t.value !== "")
              .map((t) => ({
                from: Number(t.from) || 0,
                to: t.to === "" ? null : Number(t.to),
                value: Number(t.value) || 0,
              })),
          };
        })(),
      })
      .eq("id", user.id),
      supabase
        .from("profiles")
        .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
        .eq("id", user.id),
    ]);

    setBusy(false);
    if (pErr) return toast.error(pErr.message);
    if (error) return toast.error(error.message);
    setDirty(false);
    if (draftKey) {
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      draftRef.current = {};
    }
    toast.success(t("escortSettings.profileSaved"));
    navigate("/dashboard");
  };

  if (!authLoading && role !== "begeleider") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Nav />
        <main className="max-w-2xl mx-auto px-6 py-24">
          <p className="text-brass-deep/80">{t("escortSettings.onlyForEscorts")}</p>
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
            {t("escortSettings.headerKicker")} {profile?.anonymous_id ? `#${profile.anonymous_id}` : ""}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic mb-10">
            {t("escortSettings.title")}
          </h1>

          {loading ? (
            <p className="text-sm text-brass-deep/80">{t("common.loading", { defaultValue: "Laden…" })}</p>
          ) : (
            <>
              <GoogleCalendarCard />
              <div className="mb-6"><EmailChangeCard /></div>
              <div className="mb-6"><AccountDeletionCard /></div>
              <NotificationPreferencesCard />
              <form
              onSubmit={save}
              onInput={(e) => {
                setDirty(true);
                const target = e.target as HTMLInputElement;
                if (target && target.name) {
                  writeDraft({ [target.name]: target.value });
                }
              }}
              onChange={() => setDirty(true)}
              className="bg-card shadow-etched p-8 md:p-10 space-y-8"
            >
              <section className="space-y-3">
                <p className="text-[11px] text-brass-deep/80" dangerouslySetInnerHTML={{ __html: t("escortSettings.shareNameHint") }} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("escortSettings.fullName")}</Label>
                    <input
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); setDirty(true); }}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                  </div>
                  <div>
                    <Label>{t("escortSettings.phone")}</Label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setDirty(true); }}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-[11px] text-brass-deep/80" dangerouslySetInnerHTML={{ __html: t("escortSettings.addressHint") }} />
                <p className="text-[11px] text-brass-deep/80 italic">{t("escortSettings.baseLocationHint")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t("escortSettings.postcode")}</Label>
                    <input
                      value={postcode}
                      onChange={(e) => setPostcode(e.target.value)}
                      onBlur={runAddressLookup}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold uppercase"
                    />
                  </div>
                  <div>
                    <Label>{t("escortSettings.houseNumber")}</Label>
                    <input
                      value={houseNumber}
                      onChange={(e) => setHouseNumber(e.target.value)}
                      onBlur={runAddressLookup}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>{t("escortSettings.streetCityAuto")}</Label>
                    <input
                      readOnly
                      value={street || city ? `${street}${street && city ? ", " : ""}${city}` : ""}
                      placeholder={(lookupBusy ? t("escortSettings.lookingUp") : t("escortSettings.fillFromPostcode")) as string}
                      className="mt-1 w-full bg-patina/40 border border-brass-deep/15 px-4 py-3 text-sm text-brass-deep/80 focus:outline-none"
                    />
                    <p className="text-[10px] text-brass-deep/80 mt-1">
                      {lookupBusy ? t("escortSettings.lookingUp") : street ? `${street} ${houseNumber}, ${city}` : t("escortSettings.addressFooter")}
                    </p>
                  </div>
                  {categories.includes("nl") && (
                    <Input name="hourlyRate" type="number" step="0.01" label={t("escortSettings.hourlyRateNL") as string} defaultValue={dv("hourlyRate", String(profile?.hourly_rate ?? 55))} />
                  )}
                  {(categories.includes("be-1") || categories.includes("be-2")) && (
                    <Input name="hourlyRateBe" type="number" step="0.01" label={t("escortSettings.hourlyRateBE") as string} defaultValue={dv("hourlyRateBe", String((profile as any)?.hourly_rate_be ?? profile?.hourly_rate ?? 55))} />
                  )}
                  {categories.includes("de") && (
                    <Input name="hourlyRateDe" type="number" step="0.01" label={t("escortSettings.hourlyRateDE") as string} defaultValue={dv("hourlyRateDe", String((profile as any)?.hourly_rate_de ?? profile?.hourly_rate ?? 55))} />
                  )}
                  {categories.includes("fr") && (
                    <Input name="hourlyRateFr" type="number" step="0.01" label={t("escortSettings.hourlyRateFR") as string} defaultValue={dv("hourlyRateFr", String((profile as any)?.hourly_rate_fr ?? profile?.hourly_rate ?? 55))} />
                  )}
                  {categories.includes("lu") && (
                    <Input name="hourlyRateLu" type="number" step="0.01" label={t("escortSettings.hourlyRateLU") as string} defaultValue={dv("hourlyRateLu", String((profile as any)?.hourly_rate_lu ?? profile?.hourly_rate ?? 55))} />
                  )}
                  {categories.includes("de") && (
                    <div>
                      <Input
                        name="kmRateDe"
                        type="number"
                        step="0.01"
                        label={t("escortSettings.kmRateDE") as string}
                        defaultValue={dv(
                          "kmRateDe",
                          (profile as any)?.km_rate_de == null ? "" : String((profile as any).km_rate_de),
                        )}
                      />
                      <p className="text-[10px] text-brass-deep/80 mt-1">
                        {t("escortSettings.kmRateDEHint")}
                      </p>
                    </div>
                  )}
                  <Input name="minBillableHours" type="number" step="0.25" label={t("escortSettings.minBillable") as string} defaultValue={dv("minBillableHours", String((profile as any)?.min_billable_hours ?? 0))} />
                  <Input
                    name="vehicleType"
                    label={t("escortSettings.pilotVehicleType") as string}
                    defaultValue={dv("vehicleType", profile?.vehicle_type ?? "")}
                  />
                </div>
              </section>

              <section>
                <Label>{t("escortSettings.countriesCertified")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COUNTRY_CERTS.map((c) => (
                    <Toggle key={c.id} on={categories.includes(c.id)} onClick={() => setCategories((s) => toggle(s, c.id))}>
                      {c.label}
                    </Toggle>
                  ))}
                </div>
              </section>

              <section>
                <Label>{t("escortSettings.languagesSpoken")}</Label>
                <p className="text-[11px] text-brass-deep/80 mt-1 mb-2">
                  {t("escortSettings.languagesHint")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((l) => (
                    <Toggle
                      key={l}
                      on={languages.includes(l)}
                      onClick={() => setLanguages((s) => toggle(s, l))}
                    >
                      {l}
                    </Toggle>
                  ))}
                </div>
              </section>

              {(() => {
                const baseCountry = detectCountry(postcode || "");
                if (baseCountry === "be" || baseCountry === "fr") return null;
                return (
              <section>
                <Label>{t("escortSettings.fuelTitle")}</Label>
                <p className="text-[11px] text-brass-deep/80 mt-1 mb-3">
                  {t("escortSettings.fuelIntro")}
                  {currentFuel && (
                    <> <span dangerouslySetInnerHTML={{ __html: t("escortSettings.fuelCurrentPrice", { p: Number(currentFuel.eur_per_liter).toFixed(3), w: currentFuel.week_start }) }} /></>
                  )}
                </p>
                <label className="flex items-center gap-2 mb-3 text-sm">
                  <input
                    type="checkbox"
                    checked={fuel.enabled}
                    onChange={(e) => setFuel((f) => ({ ...f, enabled: e.target.checked }))}
                  />
                  {t("escortSettings.fuelEnable")}
                </label>
                {fuel.enabled && (
                  <div className="mb-3 p-3 bg-parchment border border-brass-deep/15">
                    <p className="text-[11px] text-brass-deep/70 mb-2" dangerouslySetInnerHTML={{ __html: t("escortSettings.fuelUploadHint") }} />
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={fuelParsing}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error(t("escortSettings.fuelMaxSize"));
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
                            toast.error(t("escortSettingsExtra.fuelNoTiers"));
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
                            toast.success(t("escortSettingsExtra.fuelTiersLoaded", { n: data.tiers.length }));
                          }
                        } catch (err: any) {
                          toast.error(err?.message || t("escortSettingsExtra.fuelPdfFailed"));
                        } finally {
                          setFuelParsing(false);
                          e.target.value = "";
                        }
                      }}
                      className="text-xs text-brass-deep/70 file:mr-3 file:px-3 file:py-2 file:border-0 file:bg-brass-deep file:text-parchment file:uppercase file:tracking-widest file:text-[10px] file:font-semibold disabled:opacity-50"
                    />
                    {fuelParsing && <p className="text-[11px] text-brass-gold mt-2">{t("escortSettingsExtra.fuelParsing")}</p>}
                  </div>
                )}
                {fuel.enabled && (
                  <>
                    <div className="flex gap-2 mb-2 text-sm">
                      <span className="text-brass-deep/80">{t("escortSettings.fuelUnit")}</span>
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={fuel.kind === "per_uur"} onChange={() => setFuel((f) => ({ ...f, kind: "per_uur" }))} /> {t("escortSettings.fuelPerHour")}
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" checked={fuel.kind === "percent"} onChange={() => setFuel((f) => ({ ...f, kind: "percent" }))} /> {t("escortSettings.fuelPercent")}
                      </label>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">
                        <div className="col-span-4">{t("escortSettings.fuelFromCol")}</div>
                        <div className="col-span-4">{t("escortSettings.fuelToCol")}</div>
                        <div className="col-span-3">{fuel.kind === "percent" ? t("escortSettings.fuelValueColPct") : t("escortSettings.fuelValueColEur")}</div>
                      </div>
                      {fuel.tiers.map((t2, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2">
                          <input value={t2.from} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, from: e.target.value } : x) }))} placeholder="0" className="col-span-4 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <input value={t2.to} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, to: e.target.value } : x) }))} placeholder="∞" className="col-span-4 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <input value={t2.value} onChange={(e) => setFuel((f) => ({ ...f, tiers: f.tiers.map((x, j) => j === i ? { ...x, value: e.target.value } : x) }))} placeholder="0" className="col-span-3 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                          <button type="button" onClick={() => setFuel((f) => ({ ...f, tiers: f.tiers.filter((_, j) => j !== i) }))} className="col-span-1 px-2 py-2 text-[10px] text-brass-deep/80 hover:text-brass-deep border border-brass-deep/15">×</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setFuel((f) => ({ ...f, tiers: [...f.tiers, { from: "", to: "", value: "" }] }))} className="px-4 py-2 text-[10px] uppercase tracking-widest font-semibold border border-brass-deep/30 text-brass-deep hover:bg-brass-deep hover:text-parchment transition-colors">
                        {t("escortSettings.fuelAddTier")}
                      </button>
                    </div>
                  </>
                )}
              </section>
                );
              })()}

              <section className="bg-brass-gold/5 border border-brass-gold/30 p-4">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-1">{t("escortSettings.availability")}</p>
                <p className="text-sm text-brass-deep/80" dangerouslySetInnerHTML={{ __html: t("escortSettings.availabilityHint") }} />
              </section>

              <button
                disabled={busy}
                className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
              >
                {busy ? t("escortSettings.busy") : t("escortSettings.saveProfile")}
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
  <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{children}</label>
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
