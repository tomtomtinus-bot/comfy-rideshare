import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { distanceKm, travelMinutes, emptyTravelMinutes } from "@/lib/geo";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { RequireSubscription } from "@/components/RequireSubscription";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";
import { LocationPickerDialog } from "@/components/site/LocationPickerDialog";
import { uploadPermitPdf } from "@/lib/uploadPermit";
import { Loader2, Upload, X, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type FuelSurcharge = {
  enabled?: boolean;
  kind?: "per_uur" | "percent";
  tiers?: { from?: string | number; to?: string | number; value?: string | number }[];
} | null;

const hasFuelSurcharge = (fs: FuelSurcharge): boolean =>
  !!fs && fs.enabled === true && Array.isArray(fs.tiers) && fs.tiers.some((t) => Number(t?.value) > 0);

/** Today as YYYY-MM-DD in the user's local timezone (not UTC). */
const todayLocalDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Convert a wall-clock date+time entered by the user (always meant as
 * Europe/Amsterdam time) to a correct UTC ISO string, regardless of the
 * browser's timezone. Two-pass refinement handles DST cleanly.
 */
const nlISO = (dateStr: string, timeStr: string): string => {
  const wantedUtcMs = new Date(`${dateStr}T${timeStr}:00Z`).getTime();
  let guess = new Date(wantedUtcMs);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(guess);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const nlAsUtcMs = new Date(
      `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
    ).getTime();
    guess = new Date(guess.getTime() + (wantedUtcMs - nlAsUtcMs));
  }
  return guess.toISOString();
};

const makeSchema = (t: (k: string) => string) => z.object({
  pickup_address: z.string().trim().min(2).max(200),
  dropoff_address: z.string().trim().min(2).max(200),
  scheduled_date: z.string().min(1, t("request.dateRequired")),
  scheduled_time: z.string().min(1, t("request.timeRequired")),
  num_escorts: z.coerce.number().int().min(1),
  notes: z.string().trim().max(500).optional(),
  cargo_length_m: z.preprocess((v) => { if (v === "" || v == null) return undefined; const n = Number(String(v).replace(",", ".")); return Number.isNaN(n) ? undefined : n; }, z.number().min(0).max(120).optional()),
  cargo_width_m: z.preprocess((v) => { if (v === "" || v == null) return undefined; const n = Number(String(v).replace(",", ".")); return Number.isNaN(n) ? undefined : n; }, z.number().min(0).max(15).optional()),
  cargo_height_m: z.preprocess((v) => { if (v === "" || v == null) return undefined; const n = Number(String(v).replace(",", ".")); return Number.isNaN(n) ? undefined : n; }, z.number().min(0).max(8).optional()),
  cargo_weight_t: z.preprocess((v) => { if (v === "" || v == null) return undefined; const n = Number(String(v).replace(",", ".")); return Number.isNaN(n) ? undefined : n; }, z.number().min(0).max(500).optional()),
  permit_number: z.string().trim().max(60).optional(),
  client_reference: z.string().trim().max(80).optional(),
});

const QUARTER_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

interface MatchedEscort {
  id: string;
  anonymous_id: string;
  base_city: string;
  base_lat: number;
  base_lng: number;
  hourly_rate: number;
  hourly_rate_be: number;
  hourly_rate_de: number;
  hourly_rate_fr: number;
  hourly_rate_lu: number;
  km_rate_de: number | null;
  effective_rate: number;
  is_be_ride: boolean;
  is_de_ride: boolean;
  is_fr_ride: boolean;
  is_lu_ride: boolean;
  de_km_mode: boolean;
  rating: number;
  rides_completed: number;
  countries: string[];
  categories: string[];
  distanceToPickup: number;
  distanceFromDropoff: number;
  travelToPickupMin: number;
  travelBackHomeMin: number;
  is_favorite?: boolean;
  fuel_surcharge?: FuelSurcharge;
  conflict?: {
    rideStart: string; // ISO
    rideEnd: string;
    overlapStart: string;
    overlapEnd: string;
  } | null;
}

interface GeoPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface ExtraLeg {
  pickup_address: string;
  pickup: GeoPoint | null;
  dropoff_address: string;
  dropoff: GeoPoint | null;
  scheduled_date: string;
  scheduled_time: string;
  end_date: string;
  end_time: string;
  permit_number: string;
  drivers: { name: string; phone: string }[];
}

const fmtHours = (min: number) => {
  const total = Math.ceil(min / 15) * 15;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
};

const RequestRideInner = () => {
  const { t } = useTranslation();
  const { user, isApproved } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bundleCtx = useMemo(() => {
    const id = searchParams.get("bundle");
    const label = searchParams.get("label");
    return id && label ? { id, label } : null;
  }, [searchParams]);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchedEscort[] | null>(null);

  const STORAGE_KEY = "requestRide:draft:v1";
  const initial = (() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  })();

  const [pickupGeo, setPickupGeo] = useState<GeoPoint | null>(initial?.pickupGeo ?? null);
  const [dropoffGeo, setDropoffGeo] = useState<GeoPoint | null>(initial?.dropoffGeo ?? null);

  const [uploadedPermit, setUploadedPermit] = useState<{
    id: string;
    permit_number: string;
    carrier: string | null;
    pdf_path: string;
    routes_count: number;
  } | null>(initial?.uploadedPermit ?? null);
  const [permitUploading, setPermitUploading] = useState(false);
  const [confirmRemovePermit, setConfirmRemovePermit] = useState(false);

  const [form, setForm] = useState(initial?.form ?? {
    pickup_address: "",
    dropoff_address: "",
    scheduled_date: "",
    scheduled_time: "",
    num_escorts: 1,
    notes: "",
    cargo_length_m: "",
    cargo_width_m: "",
    cargo_height_m: "",
    cargo_weight_t: "",
    permit_number: "",
    client_reference: "",
    be_escort_type: "type1" as "type1" | "type2",
  });

  const [drivers, setDrivers] = useState<{ name: string; phone: string }[]>(initial?.drivers ?? []);
  const [licensePlates, setLicensePlates] = useState<string[]>(initial?.licensePlates ?? []);
  const [extraLegs, setExtraLegs] = useState<ExtraLeg[]>(
    (initial?.extraLegs ?? []).map((l: Partial<ExtraLeg>) => ({
      pickup_address: l.pickup_address ?? "",
      pickup: l.pickup ?? null,
      dropoff_address: l.dropoff_address ?? "",
      dropoff: l.dropoff ?? null,
      scheduled_date: l.scheduled_date ?? "",
      scheduled_time: l.scheduled_time ?? "",
      end_date: l.end_date ?? "",
      end_time: l.end_time ?? "",
      permit_number: l.permit_number ?? "",
      drivers: l.drivers ?? [],
    }))
  );
  const [selectionMode, setSelectionMode] = useState<"auto" | "manual">(
    (initial?.selectionMode as "auto" | "manual") ?? "auto"
  );
  const [pickerTarget, setPickerTarget] = useState<
    | { kind: "main-pickup" | "main-dropoff" }
    | { kind: "extra-pickup" | "extra-dropoff"; index: number }
    | null
  >(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        form, pickupGeo, dropoffGeo, uploadedPermit, drivers, licensePlates, extraLegs, selectionMode,
      }));
    } catch {}
  }, [form, pickupGeo, dropoffGeo, uploadedPermit, drivers, licensePlates, extraLegs, selectionMode]);

  const addExtraLeg = () => setExtraLegs((l) => [...l, {
    pickup_address: "", pickup: null, dropoff_address: "", dropoff: null,
    scheduled_date: "", scheduled_time: "", end_date: "", end_time: "",
    permit_number: "", drivers: [],
  }]);
  const updateExtraLeg = (i: number, patch: Partial<ExtraLeg>) =>
    setExtraLegs((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeExtraLeg = (i: number) => setExtraLegs((l) => l.filter((_, idx) => idx !== i));

  const addDriver = () => setDrivers((d) => [...d, { name: "", phone: "" }]);
  const updateDriver = (i: number, patch: Partial<{ name: string; phone: string }>) =>
    setDrivers((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeDriver = (i: number) => setDrivers((d) => d.filter((_, idx) => idx !== i));

  const addPlate = () => setLicensePlates((p) => [...p, ""]);
  const updatePlate = (i: number, v: string) =>
    setLicensePlates((p) => p.map((x, idx) => (idx === i ? v.toUpperCase() : x)));
  const removePlate = (i: number) => setLicensePlates((p) => p.filter((_, idx) => idx !== i));

  // Auto-fill vergunningnummer alleen wanneer het veld nog leeg is — nooit
  // een handmatig getypte waarde overschrijven na een nieuwe upload.
  useEffect(() => {
    if (!uploadedPermit?.permit_number) return;
    setForm((f) => (f.permit_number?.trim() ? f : { ...f, permit_number: uploadedPermit.permit_number }));
  }, [uploadedPermit]);

  const [confirmReset, setConfirmReset] = useState(false);
  const resetDraft = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setForm({
      pickup_address: "", dropoff_address: "", scheduled_date: "", scheduled_time: "",
      num_escorts: 1, notes: "",
      cargo_length_m: "", cargo_width_m: "", cargo_height_m: "", cargo_weight_t: "",
      permit_number: "", client_reference: "",
      be_escort_type: "type1",
    });
    setPickupGeo(null);
    setDropoffGeo(null);
    setUploadedPermit(null);
    setDrivers([]);
    setLicensePlates([]);
    setExtraLegs([]);
    setMatches(null);
    setSelectionMode("auto");
    setConfirmReset(false);
    toast.success(t("request.draftCleared", { defaultValue: "Concept gewist" }));
  };

  const extractPermitNumberFromFilename = (filename: string): string => {
    const base = filename.replace(/\.[^.]+$/, "");
    // Onthffingsnummer is altijd 10 cijfers, beginnend met 20.
    // Verwijder alle niet-cijfers en zoek de eerste 10-cijferige reeks die met 20 begint.
    const digitsOnly = base.replace(/\D/g, "");
    for (let i = 0; i <= digitsOnly.length - 10; i++) {
      const candidate = digitsOnly.slice(i, i + 10);
      if (candidate.startsWith("20")) return candidate;
    }
    return "";
  };

  const handlePermitFile = async (file: File | null) => {
    if (!file || !user) return;
    let permitNumber = form.permit_number.trim();
    if (!permitNumber) {
      const guessed = extractPermitNumberFromFilename(file.name);
      if (guessed) {
        permitNumber = guessed;
        setForm((f) => ({ ...f, permit_number: guessed }));
      }
    }

    setPermitUploading(true);
    try {
      toast.info(t("request.permitRead"));
      const up = await uploadPermitPdf(file, user.id, permitNumber);
      setUploadedPermit(up);
      toast.success(t("request.permitUploaded", { nr: up.permit_number || file.name }));
    } catch (e: any) {
      toast.error(e?.message ?? t("request.uploadFail"));
    } finally {
      setPermitUploading(false);
    }
  };

  const removeUploadedPermit = async () => {
    if (!uploadedPermit) return;
    await supabase.storage.from("permits").remove([uploadedPermit.pdf_path]).catch(() => {});
    await supabase.from("permits").delete().eq("id", uploadedPermit.id);
    setUploadedPermit(null);
    setForm((f) => ({ ...f, permit_number: "" }));
  };

  const onPickPickup = (r: AddressResult) => {
    setForm((f) => ({ ...f, pickup_address: r.display }));
    setPickupGeo({ city: r.city, country: r.country, lat: r.lat, lng: r.lng });
  };
  const onPickDropoff = (r: AddressResult) => {
    setForm((f) => ({ ...f, dropoff_address: r.display }));
    setDropoffGeo({ city: r.city, country: r.country, lat: r.lat, lng: r.lng });
  };

  // Build full leg list (main + extras) ordered as entered. Each leg has start/end ms.
  const buildLegs = () => {
    if (!pickupGeo || !dropoffGeo || !form.scheduled_date || !form.scheduled_time) return null;
    const legs: Array<{ pickup: GeoPoint; dropoff: GeoPoint; startMs: number; durMin: number; endMs: number; }> = [];
    const main = {
      pickup: pickupGeo, dropoff: dropoffGeo,
      startMs: new Date(nlISO(form.scheduled_date, form.scheduled_time)).getTime(),
      durMin: travelMinutes(distanceKm(pickupGeo, dropoffGeo)),
    };
    legs.push({ ...main, endMs: main.startMs + main.durMin * 60_000 });
    for (const ex of extraLegs) {
      if (!ex.pickup || !ex.dropoff || !ex.scheduled_date || !ex.scheduled_time) return null;
      if (!ex.end_time) return null;
      const startMs = new Date(nlISO(ex.scheduled_date, ex.scheduled_time)).getTime();
      const endMs = new Date(nlISO(ex.end_date || ex.scheduled_date, ex.end_time)).getTime();
      if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) return null;
      const durMin = Math.round((endMs - startMs) / 60_000);
      legs.push({ pickup: ex.pickup, dropoff: ex.dropoff, startMs, durMin, endMs });
    }
    return legs;
  };

  const findMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = makeSchema(t).safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!pickupGeo || !dropoffGeo) return toast.error(t("request.postcodesPending"));
    const [hh, mm] = form.scheduled_time.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm) || mm % 15 !== 0) return toast.error(t("request.startQuarter"));
    const scheduledDate = new Date(nlISO(form.scheduled_date, form.scheduled_time));
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return toast.error(t("request.pastNotAllowed", { defaultValue: "Starttijd moet in de toekomst liggen." }));
    }
    const legs = buildLegs();
    if (!legs) return toast.error("Vul alle aansluitende ritten volledig in (adres + tijd).");
    for (let i = 1; i < legs.length; i++) {
      if (legs[i].startMs < legs[i - 1].endMs) {
        return toast.error(`Aansluitende rit ${i + 1} start vóór het einde van de vorige rit.`);
      }
    }

    setBusy(true);
    const [{ data, error }, { data: excludedRows }, { data: favoriteRows }, { data: filterRows }] = await Promise.all([
      supabase
        .from("escort_profiles_public")
        .select("id, anonymous_id, base_city, base_lat, base_lng, hourly_rate, hourly_rate_be, hourly_rate_de, hourly_rate_fr, hourly_rate_lu, km_rate_de, rating, rides_completed, countries, categories, available, fuel_surcharge")
        .eq("available", true),
      supabase
        .from("client_excluded_escorts")
        .select("escort_id")
        .eq("client_id", user!.id),
      supabase
        .from("client_favorite_escorts")
        .select("escort_id")
        .eq("client_id", user!.id),
      supabase.rpc("escort_ids_excluding_client", { _client_id: user!.id }),
    ]);
    setBusy(false);
    if (error) return toast.error(error.message);
    const excludedSet = new Set((excludedRows ?? []).map((r: any) => r.escort_id));
    const favoriteSet = new Set((favoriteRows ?? []).map((r: any) => r.escort_id));
    const escortFilteredOut = new Set((filterRows ?? []).map((r: any) => r.escort_id));

    // Grenslocaties als "NL/BE" splitsen we naar beide landen; begeleider moet minstens één van de landen dekken
    const expandCountries = (c: string): string[] => {
      const map: Record<string, string> = { NL: "Nederland", BE: "België", DE: "Duitsland", FR: "Frankrijk", LU: "Luxemburg" };
      return c.split("/").map((p) => map[p.trim()] ?? p.trim());
    };
    const pickupCountries = expandCountries(pickupGeo.country);
    const dropoffCountries = expandCountries(dropoffGeo.country);

    // Bij een grensovergang (meerdere landen in één locatie) telt alleen het land
    // waarin de begeleider daadwerkelijk rijdt. Dat is het land dat door beide
    // eindpunten wordt gedeeld; bij één enkel grenspunt nemen we het land van het
    // andere (binnenlandse) eindpunt.
    const deriveDriveCountries = (pu: string[], dr: string[]): string[] => {
      const overlap = pu.filter((c) => dr.includes(c));
      if (pu.length > 1 && dr.length > 1) {
        return overlap.length ? overlap : Array.from(new Set([...pu, ...dr]));
      }
      if (pu.length > 1) return overlap.length ? overlap : dr;
      if (dr.length > 1) return overlap.length ? overlap : pu;
      return Array.from(new Set([...pu, ...dr]));
    };
    const driveCountries = deriveDriveCountries(pickupCountries, dropoffCountries);

    // Begeleidingstijd loopt van start eerste leg tot einde laatste leg (incl. wachten).
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const lastDropoffGeo = lastLeg.dropoff;
    const rideMin = Math.max(1, Math.round((lastLeg.endMs - firstLeg.startMs) / 60_000));
    const scheduledISO = new Date(firstLeg.startMs).toISOString();
    const rideStartMs = firstLeg.startMs;

    // België-vereiste: type 2 begeleider mag ook een type 1 rit doen, maar niet andersom
    const beInvolved = driveCountries.includes("België");
    const beTypeRequired = beInvolved ? form.be_escort_type : null;
    const escortHasBeQualification = (cats: string[] | null): boolean => {
      const c = cats ?? [];
      if (!beTypeRequired) return true;
      if (beTypeRequired === "type2") return c.includes("be-2");
      return c.includes("be-1") || c.includes("be-2");
    };

    const escortCountrySet = (e: { countries?: string[] | null; categories?: string[] | null }) => {
      const set = new Set((e.countries ?? []) as string[]);
      const cats = (e.categories ?? []) as string[];
      if (cats.includes("nl")) set.add("Nederland");
      if (cats.includes("be-1") || cats.includes("be-2")) set.add("België");
      if (cats.includes("de")) set.add("Duitsland");
      if (cats.includes("fr")) set.add("Frankrijk");
      if (cats.includes("lu")) set.add("Luxemburg");
      return set;
    };

    const ranked: MatchedEscort[] = (data ?? [])
      .filter((e) => {
        if (excludedSet.has(e.id)) return false; // respecteer pool-uitsluitingen
        if (escortFilteredOut.has(e.id)) return false; // begeleider heeft deze opdrachtgever uitgesloten
        const ec = escortCountrySet(e as any);
        // Begeleider moet ALLE landen dekken waarin daadwerkelijk gereden wordt.
        // Bij grensovergangen telt alleen het land aan de gereden zijde mee.
        return driveCountries.every((c) => ec.has(c)) && escortHasBeQualification((e as any).categories ?? []);
      })
      .map((e) => {
        const dPickup = distanceKm({ lat: e.base_lat, lng: e.base_lng }, pickupGeo);
        const dDropoff = distanceKm({ lat: e.base_lat, lng: e.base_lng }, lastDropoffGeo);
        const isBe = driveCountries.includes("België");
        const isDe = driveCountries.includes("Duitsland");
        const isFr = driveCountries.includes("Frankrijk");
        const isLu = driveCountries.includes("Luxemburg");
        const escortCountries = escortCountrySet(e as any);
        const kmRateDe = (e as any).km_rate_de == null ? null : Number((e as any).km_rate_de);
        const deKmMode = isDe && escortCountries.has("Duitsland") && kmRateDe != null && kmRateDe > 0;
        // Volgorde: meest specifiek betrokken land bepaalt het tarief uit het profiel.
        // De profiel-certificeringen/categories tellen mee, zodat oude countries-data geen tarief kan blokkeren.
        let rate = Number(e.hourly_rate);
        if (isLu && escortCountries.has("Luxemburg")) rate = Number((e as any).hourly_rate_lu ?? e.hourly_rate);
        else if (isFr && escortCountries.has("Frankrijk")) rate = Number((e as any).hourly_rate_fr ?? e.hourly_rate);
        else if (isDe && escortCountries.has("Duitsland")) rate = deKmMode ? Number(kmRateDe) : Number((e as any).hourly_rate_de ?? e.hourly_rate);
        else if (isBe && escortCountries.has("België")) rate = Number(e.hourly_rate_be ?? e.hourly_rate);
        return {
          ...e,
          hourly_rate_de: Number((e as any).hourly_rate_de ?? e.hourly_rate),
          hourly_rate_fr: Number((e as any).hourly_rate_fr ?? e.hourly_rate),
          hourly_rate_lu: Number((e as any).hourly_rate_lu ?? e.hourly_rate),
          km_rate_de: kmRateDe,
          distanceToPickup: dPickup,
          distanceFromDropoff: dDropoff,
          travelToPickupMin: emptyTravelMinutes(dPickup),
          travelBackHomeMin: emptyTravelMinutes(dDropoff),
          is_be_ride: isBe,
          is_de_ride: isDe,
          is_fr_ride: isFr,
          is_lu_ride: isLu,
          de_km_mode: deKmMode,
          effective_rate: rate,
          is_favorite: favoriteSet.has(e.id),
          conflict: null,
        } as MatchedEscort;
      })
      .sort((a, b) => {
        // Favorieten altijd bovenaan, daarna op kortste afstand
        if (!!a.is_favorite !== !!b.is_favorite) return a.is_favorite ? -1 : 1;
        return Math.min(a.distanceToPickup, a.distanceFromDropoff) - Math.min(b.distanceToPickup, b.distanceFromDropoff);
      })
      .slice(0, 25);

    if (ranked.length === 0) return toast.error(t("request.noEscorts"));

    // Aanvoer- en afvoertijd via Google Maps (zonder verkeer = "schone" reistijd).
    // departure_time wordt bewust niet meegegeven, zodat Google de statische duur
    // teruggeeft en eventuele files buiten beschouwing blijven.
    const roundQuarter = (sec: number) => Math.max(15, Math.ceil((sec / 60) / 15) * 15);
    const fetchLegMin = async (
      origin: { lat: number; lng: number },
      destination: { lat: number; lng: number },
    ): Promise<number | null> => {
      try {
        const { data, error } = await supabase.functions.invoke("google-directions", {
          body: { origin, destination },
        });
        if (error || !data?.duration_s) return null;
        return roundQuarter(Number(data.duration_s));
      } catch {
        return null;
      }
    };
    const rankedWithDirections = await Promise.all(ranked.map(async (m) => {
      const base = { lat: (m as any).base_lat as number, lng: (m as any).base_lng as number };
      const [toPickup, backHome] = await Promise.all([
        fetchLegMin(base, pickupGeo),
        fetchLegMin(lastDropoffGeo, base),
      ]);
      return {
        ...m,
        travelToPickupMin: toPickup ?? m.travelToPickupMin,
        travelBackHomeMin: backHome ?? m.travelBackHomeMin,
      };
    }));

    // Bezetting: alleen pure ritvenster (zonder reistijd), alleen ViaCust-ritten.
    const withConflicts = await Promise.all(rankedWithDirections.map(async (m) => {
      const myStartMs = rideStartMs;
      const myEndMs = rideStartMs + rideMin * 60_000;
      const fromIso = new Date(myStartMs - 24 * 3600_000).toISOString();
      const toIso = new Date(myEndMs + 24 * 3600_000).toISOString();
      const { data: windows } = await supabase.rpc("get_escort_busy_windows", {
        _escort_id: m.id,
        _from: fromIso,
        _to: toIso,
      });
      const overlap = (windows ?? []).find((w: any) => {
        const ws = new Date(w.window_start).getTime();
        const we = new Date(w.window_end).getTime();
        return ws < myEndMs && we > myStartMs;
      });
      if (!overlap) return m;
      const ws = new Date(overlap.window_start).getTime();
      const we = new Date(overlap.window_end).getTime();
      return {
        ...m,
        conflict: {
          rideStart: new Date(myStartMs).toISOString(),
          rideEnd: new Date(myEndMs).toISOString(),
          overlapStart: new Date(Math.max(ws, myStartMs)).toISOString(),
          overlapEnd: new Date(Math.min(we, myEndMs)).toISOString(),
        },
      };
    }));

    setMatches(withConflicts);

    if (selectionMode === "auto") {
      const auto = withConflicts.filter((m) => !m.conflict);
      if (auto.length < form.num_escorts) {
        toast.warning(
          `Er zijn maar ${auto.length} geschikte begeleider${auto.length === 1 ? "" : "s"} beschikbaar (gevraagd: ${form.num_escorts}). Kies hieronder zelf wie je wilt uitnodigen of pas de aanvraag aan.`
        );
        return;
      }
      await bookEscortsInternal(auto, { auto: true });
    }
  };

  const bookEscorts = (selected: MatchedEscort[]) => bookEscortsInternal(selected, { auto: false });

  const bookEscortsInternal = async (selected: MatchedEscort[], opts: { auto: boolean }) => {
    if (!user || !pickupGeo || !dropoffGeo) return;
    if (!opts.auto && selected.length !== form.num_escorts) {
      return toast.error(t("request.pickExact", { n: form.num_escorts }));
    }
    const legs = buildLegs();
    if (!legs) return toast.error("Vul alle aansluitende ritten volledig in (adres + tijd).");
    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];
    const lastDropoffGeo = lastLeg.dropoff;
    const rideMin = Math.max(1, Math.round((lastLeg.endMs - firstLeg.startMs) / 60_000));

    setBusy(true);

    // #4 Race-revalidatie: controleer vlak vóór insert opnieuw of de geselecteerde
    // begeleiders nog vrij zijn in het ritvenster. Voorkomt dubbele boekingen
    // tussen "Zoek begeleiders" en "Boek".
    const myStartMs = firstLeg.startMs;
    const myEndMs = lastLeg.endMs;
    const fromIso = new Date(myStartMs - 24 * 3600_000).toISOString();
    const toIso = new Date(myEndMs + 24 * 3600_000).toISOString();
    const conflicts: string[] = [];
    await Promise.all(selected.map(async (e) => {
      const { data: windows } = await supabase.rpc("get_escort_busy_windows", {
        _escort_id: e.id, _from: fromIso, _to: toIso,
      });
      const overlap = (windows ?? []).find((w: any) => {
        const ws = new Date(w.window_start).getTime();
        const we = new Date(w.window_end).getTime();
        return ws < myEndMs && we > myStartMs;
      });
      if (overlap) conflicts.push(e.anonymous_id);
    }));
    if (conflicts.length > 0) {
      setBusy(false);
      return toast.error(
        `Begeleider${conflicts.length > 1 ? "s" : ""} #${conflicts.join(", #")} ${conflicts.length > 1 ? "zijn" : "is"} ondertussen geboekt. Zoek opnieuw.`,
      );
    }

    const scheduledISO = new Date(firstLeg.startMs).toISOString();
    const lastEndISO = new Date(lastLeg.endMs).toISOString();
    const extraLegsPayload = extraLegs.map((ex) => ({
      pickup_address: ex.pickup_address,
      pickup_city: ex.pickup!.city,
      pickup_lat: ex.pickup!.lat,
      pickup_lng: ex.pickup!.lng,
      dropoff_address: ex.dropoff_address,
      dropoff_city: ex.dropoff!.city,
      dropoff_lat: ex.dropoff!.lat,
      dropoff_lng: ex.dropoff!.lng,
      scheduled_at: nlISO(ex.scheduled_date, ex.scheduled_time),
      end_at: nlISO(ex.end_date || ex.scheduled_date, ex.end_time),
      permit_number: ex.permit_number.trim() || null,
      drivers: ex.drivers
        .map((d) => ({ name: d.name.trim(), phone: d.phone.trim() }))
        .filter((d) => d.name || d.phone),
    }));

    const { data: ride, error } = await supabase
      .from("rides")
      .insert({
        client_id: user.id,
        pickup_address: form.pickup_address,
        pickup_city: pickupGeo.city,
        pickup_lat: pickupGeo.lat,
        pickup_lng: pickupGeo.lng,
        dropoff_address: form.dropoff_address,
        dropoff_city: dropoffGeo.city,
        dropoff_lat: dropoffGeo.lat,
        dropoff_lng: dropoffGeo.lng,
        scheduled_at: scheduledISO,
        num_escorts: form.num_escorts,
        notes: form.notes || null,
        status: "open",
        app_fee: 0,
        cargo_length_m: form.cargo_length_m ? parseFloat(form.cargo_length_m.replace(",", ".")) : null,
        cargo_width_m: form.cargo_width_m ? parseFloat(form.cargo_width_m.replace(",", ".")) : null,
        cargo_height_m: form.cargo_height_m ? parseFloat(form.cargo_height_m.replace(",", ".")) : null,
        cargo_weight_t: form.cargo_weight_t ? parseFloat(form.cargo_weight_t.replace(",", ".")) : null,
        permit_number: form.permit_number || null,
        permit_id: uploadedPermit?.id ?? null,
        client_reference: form.client_reference || null,
        time_window_start: scheduledISO,
        time_window_end: extraLegsPayload.length > 0 ? lastEndISO : null,
        extra_legs: extraLegsPayload as never,
        drivers: drivers
          .map((d) => ({ name: d.name.trim(), phone: d.phone.trim() }))
          .filter((d) => d.name || d.phone) as never,
        license_plates: licensePlates.map((p) => p.trim()).filter(Boolean),
        be_escort_type: ((pickupGeo.country?.includes("BE") || pickupGeo.country?.includes("België") || dropoffGeo.country?.includes("BE") || dropoffGeo.country?.includes("België")) ? (form.be_escort_type ?? "type1") : null) as never,
      })
      .select()
      .single();

    if (error || !ride) {
      setBusy(false);
      return toast.error(error?.message ?? t("request.createFail"));
    }

    const rows = selected.map((e) => {
      const totalMin = e.travelToPickupMin + rideMin + e.travelBackHomeMin;
      const hours = +(totalMin / 60).toFixed(2);
      return {
        ride_id: ride.id,
        escort_id: e.id,
        travel_to_pickup_min: e.travelToPickupMin,
        travel_back_home_min: e.travelBackHomeMin,
        estimated_hours: hours,
        estimated_cost: +(hours * e.effective_rate).toFixed(2),
      };
    });

    const { error: aErr } = await supabase.from("ride_assignments").insert(rows);
    if (aErr) {
      // #3 Rollback: voorkom een orphan rit zonder assignments.
      await supabase.from("rides").delete().eq("id", ride.id);
      setBusy(false);
      return toast.error(aErr.message);
    }
    setBusy(false);

    // Send ride confirmation email to the client (best-effort; do not block on errors)
    if (user?.email) {
      const plannedAt = new Date(scheduledISO).toLocaleString("nl-NL", {
        dateStyle: "long",
        timeStyle: "short",
      });
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "ride-confirmation",
          recipientEmail: user.email,
          idempotencyKey: `ride-confirm-${ride.id}`,
          templateData: {
            name: (user.user_metadata as any)?.full_name ?? undefined,
            pickup: form.pickup_address || undefined,
            dropoff: form.dropoff_address || undefined,
            plannedAt,
            reference: form.client_reference || undefined,
            rideUrl: `${window.location.origin}/rit/${ride.id}`,
          },
        },
      }).catch((err) => console.error("ride-confirmation email failed", err));
    }

    // Send ride invitation emails (with one-click accept link) to all invited escorts (best-effort)
    supabase.functions.invoke("send-ride-invitations", {
      body: { rideId: ride.id, origin: window.location.origin },
    }).catch((err) => console.error("send-ride-invitations failed", err));

    toast.success(t("request.rideBooked"));
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-5xl mx-auto">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            {t("request.kicker")}
          </p>
          <div className="flex items-start justify-between gap-4 mb-12">
            <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[0.95]">
              {t("request.title")}
            </h1>
            {isApproved && (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="shrink-0 text-xs uppercase tracking-[0.2em] font-semibold text-brass-deep/70 hover:text-brass-deep underline underline-offset-4 mt-2"
              >
                {t("request.startOver", { defaultValue: "Begin opnieuw" })}
              </button>
            )}
          </div>

          {!isApproved ? (
            <div className="bg-card shadow-etched p-8 md:p-10 border-l-4 border-brass-gold">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">
                {t("request.pendingKicker")}
              </p>
              <h2 className="font-display text-2xl text-brass-deep mb-3">
                {t("request.pendingTitle")}
              </h2>
              <p className="text-brass-deep/75 text-sm leading-relaxed">
                <Trans
                  i18nKey="request.pendingBody"
                  components={[<Link key="0" to="/facturatiegegevens" className="underline font-semibold" />]}
                />
              </p>
            </div>
          ) : (
          <form onSubmit={findMatches} className="bg-card shadow-etched p-8 md:p-10 space-y-8">
            <details open className="group border border-brass-deep/15 bg-card">
              <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 hover:bg-parchment/40">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">{t("request.route")}</p>
                <span className="text-brass-deep/50 text-xs transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2">
              <p className="text-[12px] text-brass-deep/80 bg-parchment/60 border border-brass-deep/15 px-3 py-2 mb-4">
                Let op: Voorlopig alleen beschikbaar in Nederland en België
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-parchment/40 p-4 border border-brass-deep/10">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-3">{t("request.pickup")}</p>
                  <AddressAutocomplete
                    label={t("request.addrLabel")}
                    value={form.pickup_address}
                    onChange={(v) => setForm({ ...form, pickup_address: v })}
                    onSelect={onPickPickup}
                    placeholder={t("request.pickupPlaceholder")}
                  />
                  {pickupGeo && (
                    <p className="text-[11px] text-brass-deep/60 mt-1">📍 {pickupGeo.city}, {pickupGeo.country}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ kind: "main-pickup" })}
                    className="mt-1 text-[11px] text-brass-deep/55 hover:text-brass-gold underline-offset-2 hover:underline"
                  >
                    Op kaart kiezen of coördinaten invoeren
                  </button>
                </div>
                <div className="bg-parchment/40 p-4 border border-brass-deep/10">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-3">{t("request.dropoff")}</p>
                  <AddressAutocomplete
                    label={t("request.addrLabel")}
                    value={form.dropoff_address}
                    onChange={(v) => setForm({ ...form, dropoff_address: v })}
                    onSelect={onPickDropoff}
                    placeholder={t("request.dropoffPlaceholder")}
                  />
                  {dropoffGeo && (
                    <p className="text-[11px] text-brass-deep/60 mt-1">📍 {dropoffGeo.city}, {dropoffGeo.country}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setPickerTarget({ kind: "main-dropoff" })}
                    className="mt-1 text-[11px] text-brass-deep/55 hover:text-brass-gold underline-offset-2 hover:underline"
                  >
                    Op kaart kiezen of coördinaten invoeren
                  </button>
                </div>
              </div>
              {pickupGeo && dropoffGeo && (() => {
                const km = distanceKm(pickupGeo, dropoffGeo);
                const min = travelMinutes(km);
                return (
                  <div className="mt-4 bg-brass-gold/10 border border-brass-gold/30 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-1">
                      {t("request.estDuration")}
                    </p>
                    <p className="text-sm text-brass-deep">
                      <strong className="tabular-nums">{Math.round(km)} km</strong> ·{" "}
                      <strong className="tabular-nums">{fmtHours(min)}</strong>{" "}
                      <span className="text-brass-deep/55">{t("request.speedHint")}</span>
                    </p>
                    <p className="text-[11px] text-brass-deep/55 italic mt-1">
                      Aan deze geschatte rijtijd kunnen geen rechten worden ontleend.
                    </p>
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Input
                  label={t("common.date")}
                  type="date"
                  min={todayLocalDate()}
                  value={form.scheduled_date}
                  onChange={(v) => setForm({ ...form, scheduled_date: v })}
                />
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.timeQuarter")}</label>
                  <input
                    type="time"
                    step={900}
                    value={form.scheduled_time}
                    onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                    placeholder="hh:mm"
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.numEscorts")}</label>
                  <div className="mt-1 flex items-stretch border border-brass-deep/15 bg-parchment">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, num_escorts: Math.max(1, form.num_escorts - 1) })}
                      className="px-4 text-lg font-bold text-brass-deep hover:bg-brass-gold/10"
                      aria-label={t("request.fewerEscorts")}
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={form.num_escorts}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        setForm({ ...form, num_escorts: Number.isNaN(v) ? 1 : Math.max(1, v) });
                      }}
                      className="flex-1 w-full bg-transparent px-2 py-3 text-sm text-center focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, num_escorts: form.num_escorts + 1 })}
                      className="px-4 text-lg font-bold text-brass-deep hover:bg-brass-gold/10"
                      aria-label={t("request.moreEscorts")}
                    >+</button>
                  </div>
                </div>
              </div>
              </div>
            </details>

            <details className="group border border-brass-deep/15 bg-card">
              <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 hover:bg-parchment/40">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                  Aansluitende ritten <span className="text-brass-deep/40 normal-case tracking-normal font-normal">(optioneel{extraLegs.length > 0 ? ` · ${extraLegs.length}` : ""})</span>
                </p>
                <span className="text-brass-deep/50 text-xs transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2">
              <div className="flex items-center justify-end mb-4">
                <button type="button" onClick={addExtraLeg} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">
                  + Rit toevoegen
                </button>
              </div>
              {extraLegs.length === 0 ? (
                <p className="text-xs text-brass-deep/55">
                  Voeg vervolgritten toe als er direct aansluitend nog meer ritten gereden worden. Aansluitende ritten kunnen met andere chauffeurs, bedrijven of ontheffingen zijn. Begeleidingstijd loopt door van start rit 1 tot einde laatste rit.
                </p>
              ) : (
                <ul className="space-y-4">
                  {extraLegs.map((leg, i) => (
                    <li key={i} className="bg-parchment/40 p-4 border border-brass-deep/10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold">Rit {i + 2}</p>
                        <button
                          type="button"
                          onClick={() => removeExtraLeg(i)}
                          className="text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                          aria-label="Verwijder rit"
                        >×</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-2">Vertrek</p>
                          <AddressAutocomplete
                            label={t("request.addrLabel")}
                            value={leg.pickup_address}
                            onChange={(v) => updateExtraLeg(i, { pickup_address: v })}
                            onSelect={(r) => updateExtraLeg(i, {
                              pickup_address: r.display,
                              pickup: { city: r.city, country: r.country, lat: r.lat, lng: r.lng },
                            })}
                            placeholder={t("request.pickupPlaceholder")}
                          />
                          {leg.pickup && (
                            <p className="text-[11px] text-brass-deep/60 mt-1">📍 {leg.pickup.city}, {leg.pickup.country}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setPickerTarget({ kind: "extra-pickup", index: i })}
                            className="mt-1 text-[11px] text-brass-deep/55 hover:text-brass-gold underline-offset-2 hover:underline"
                          >
                            Op kaart of coördinaten
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-2">Bestemming</p>
                          <AddressAutocomplete
                            label={t("request.addrLabel")}
                            value={leg.dropoff_address}
                            onChange={(v) => updateExtraLeg(i, { dropoff_address: v })}
                            onSelect={(r) => updateExtraLeg(i, {
                              dropoff_address: r.display,
                              dropoff: { city: r.city, country: r.country, lat: r.lat, lng: r.lng },
                            })}
                            placeholder={t("request.dropoffPlaceholder")}
                          />
                          {leg.dropoff && (
                            <p className="text-[11px] text-brass-deep/60 mt-1">📍 {leg.dropoff.city}, {leg.dropoff.country}</p>
                          )}
                          <button
                            type="button"
                            onClick={() => setPickerTarget({ kind: "extra-dropoff", index: i })}
                            className="mt-1 text-[11px] text-brass-deep/55 hover:text-brass-gold underline-offset-2 hover:underline"
                          >
                            Op kaart of coördinaten
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <Input
                          label="Datum"
                          type="date"
                          min={todayLocalDate()}
                          value={leg.scheduled_date}
                          onChange={(v) => updateExtraLeg(i, { scheduled_date: v, end_date: leg.end_date || v })}
                        />
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Starttijd</label>
                          <input
                            type="time"
                            value={leg.scheduled_time}
                            onChange={(e) => updateExtraLeg(i, { scheduled_time: e.target.value })}
                            placeholder="hh:mm"
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                        <Input
                          label="Einddatum"
                          type="date"
                          min={leg.scheduled_date || todayLocalDate()}
                          value={leg.end_date || leg.scheduled_date}
                          onChange={(v) => updateExtraLeg(i, { end_date: v })}
                        />
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Eindtijd</label>
                          <input
                            type="time"
                            value={leg.end_time}
                            onChange={(e) => updateExtraLeg(i, { end_time: e.target.value })}
                            placeholder="hh:mm"
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                      </div>
                      {(() => {
                        const km = leg.pickup && leg.dropoff ? distanceKm(leg.pickup, leg.dropoff) : null;
                        const sMs = leg.scheduled_date && leg.scheduled_time ? new Date(nlISO(leg.scheduled_date, leg.scheduled_time)).getTime() : NaN;
                        const eMs = leg.end_time ? new Date(nlISO(leg.end_date || leg.scheduled_date, leg.end_time)).getTime() : NaN;
                        const durMin = !isNaN(sMs) && !isNaN(eMs) && eMs > sMs ? Math.round((eMs - sMs) / 60_000) : null;
                        if (km == null && durMin == null) return null;
                        return (
                          <p className="mt-3 text-[11px] text-brass-deep/60">
                            {km != null && (<><strong className="tabular-nums">{Math.round(km)} km</strong> · geschatte rijduur <strong className="tabular-nums">{fmtHours(travelMinutes(km))}</strong></>)}
                            {durMin != null && (<> · ingevulde duur <strong className="tabular-nums">{fmtHours(durMin)}</strong></>)}
                          </p>
                        );
                      })()}
                      <div className="mt-4">
                        <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold block mb-1">Vergunningnummer (optioneel)</label>
                        <input
                          type="text"
                          value={leg.permit_number}
                          onChange={(e) => updateExtraLeg(i, { permit_number: e.target.value })}
                          placeholder="Andere ontheffing dan hoofdrit"
                          className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                        />
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Chauffeurs (optioneel)</p>
                          <button
                            type="button"
                            onClick={() => updateExtraLeg(i, { drivers: [...leg.drivers, { name: "", phone: "" }] })}
                            className="text-[10px] uppercase tracking-widest text-brass-deep font-semibold hover:text-brass-gold"
                          >+ Toevoegen</button>
                        </div>
                        {leg.drivers.length === 0 ? (
                          <p className="text-[11px] text-brass-deep/40 italic">Geen chauffeurs toegevoegd.</p>
                        ) : (
                          <ul className="space-y-2">
                            {leg.drivers.map((d, di) => (
                              <li key={di} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                <input
                                  placeholder="Naam"
                                  value={d.name}
                                  onChange={(e) => updateExtraLeg(i, { drivers: leg.drivers.map((x, j) => j === di ? { ...x, name: e.target.value } : x) })}
                                  className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm"
                                />
                                <input
                                  placeholder="Telefoon"
                                  value={d.phone}
                                  onChange={(e) => updateExtraLeg(i, { drivers: leg.drivers.map((x, j) => j === di ? { ...x, phone: e.target.value } : x) })}
                                  className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateExtraLeg(i, { drivers: leg.drivers.filter((_, j) => j !== di) })}
                                  className="px-2 text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                                  aria-label="Verwijder chauffeur"
                                >×</button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                    </li>
                  ))}
                </ul>
              )}
              {(() => {
                const legs = buildLegs();
                if (!legs || legs.length < 2) return null;
                const totalMin = Math.round((legs[legs.length - 1].endMs - legs[0].startMs) / 60_000);
                return (
                  <div className="mt-4 bg-brass-gold/10 border border-brass-gold/30 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-1">
                      Totale begeleidingstijd ({legs.length} ritten)
                    </p>
                    <p className="text-sm text-brass-deep">
                      <strong className="tabular-nums">{fmtHours(totalMin)}</strong>{" "}
                      <span className="text-brass-deep/55">van start rit 1 tot einde rit {legs.length} (excl. aanrij- en terugreistijd begeleider)</span>
                    </p>
                  </div>
                );
              })()}
              </div>
            </details>

            <details className="group border border-brass-deep/15 bg-card">
              <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 hover:bg-parchment/40">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">{t("request.cargoSection")} <span className="text-brass-deep/40 normal-case tracking-normal font-normal">({t("common.optional")})</span></p>
                <span className="text-brass-deep/50 text-xs transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label={t("request.length")} inputMode="decimal" value={form.cargo_length_m} onChange={(v) => setForm({ ...form, cargo_length_m: v })} placeholder="bv. 25.50" />
                <Input label={t("request.width")} inputMode="decimal" value={form.cargo_width_m} onChange={(v) => setForm({ ...form, cargo_width_m: v })} placeholder="bv. 4.20" />
                <Input label={t("request.height")} inputMode="decimal" value={form.cargo_height_m} onChange={(v) => setForm({ ...form, cargo_height_m: v })} placeholder="bv. 4.20" />
                <Input label={t("request.weight")} inputMode="numeric" value={form.cargo_weight_t} onChange={(v) => setForm({ ...form, cargo_weight_t: v })} placeholder="bv. 60" />
              </div>
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                  {t("request.permitLabel")}
                </label>
                {!uploadedPermit ? (
                  <label
                    className={`mt-1 flex items-center justify-center gap-3 px-4 py-6 border-2 border-dashed border-brass-deep/25 bg-parchment/40 cursor-pointer hover:bg-parchment hover:border-brass-gold transition-colors text-sm text-brass-deep/70 ${
                      permitUploading ? "opacity-60 pointer-events-none" : ""
                    }`}
                  >
                    {permitUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t("request.permitParsing")}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>{t("request.permitDrop")}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={permitUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        e.currentTarget.value = "";
                        handlePermitFile(f);
                      }}
                    />
                  </label>
                ) : (
                  <div className="mt-1 flex items-center gap-3 px-4 py-3 bg-brass-gold/10 border border-brass-gold/40 text-sm">
                    <FileText className="h-4 w-4 text-brass-deep" />
                    <div className="flex-1 min-w-0">
                      <p className="text-brass-deep font-semibold truncate">
                        {uploadedPermit.permit_number}
                        {uploadedPermit.carrier ? ` · ${uploadedPermit.carrier}` : ""}
                      </p>
                      <p className="text-[11px] text-brass-deep/60">
                        {t("request.permitAttached")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmRemovePermit(true)}
                      className="p-1.5 text-brass-deep/70 hover:text-brass-deep hover:bg-brass-deep/10"
                      aria-label={t("request.permitRemove")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-brass-deep/50 mt-1">{t("request.permitUploadHint")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input label={t("request.permitNumber")} value={form.permit_number} onChange={(v) => setForm({ ...form, permit_number: v })} placeholder={t("request.permitNumberPlaceholder")} />
                <Input label={t("request.ownRef")} value={form.client_reference} onChange={(v) => setForm({ ...form, client_reference: v })} placeholder={t("request.ownRefPlaceholder")} />
              </div>
              {(() => {
                const expand = (c?: string): string[] => {
                  if (!c) return [];
                  const map: Record<string, string> = { NL: "Nederland", BE: "België", DE: "Duitsland", FR: "Frankrijk", LU: "Luxemburg" };
                  return c.split("/").map((p) => map[p.trim()] ?? p.trim());
                };
                const pu = expand(pickupGeo?.country);
                const dr = expand(dropoffGeo?.country);
                const overlap = pu.filter((c) => dr.includes(c));
                let drive: string[];
                if (pu.length > 1 && dr.length > 1) drive = overlap.length ? overlap : Array.from(new Set([...pu, ...dr]));
                else if (pu.length > 1) drive = overlap.length ? overlap : dr;
                else if (dr.length > 1) drive = overlap.length ? overlap : pu;
                else drive = Array.from(new Set([...pu, ...dr]));
                const beInvolved = drive.includes("België");
                if (!beInvolved) return null;
                return (
                  <div className="mt-4 p-4 border border-brass-gold/40 bg-brass-gold/5">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                      Type begeleider België (vereist)
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { id: "type1", label: "Type 1", hint: "Type 1 of Type 2 begeleider" },
                        { id: "type2", label: "Type 2", hint: "Alleen Type 2 begeleider" },
                      ].map((opt) => {
                        const active = form.be_escort_type === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setForm({ ...form, be_escort_type: opt.id as "type1" | "type2" })}
                            className={`px-4 py-2 text-sm border transition ${
                              active
                                ? "bg-brass-deep text-parchment border-brass-deep"
                                : "bg-parchment text-brass-deep border-brass-deep/20 hover:border-brass-deep/50"
                            }`}
                          >
                            <span className="font-semibold">{opt.label}</span>
                            <span className="block text-[10px] opacity-70 mt-0.5">{opt.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-brass-deep/60 mt-2">
                      Een Type 2 begeleider mag ook Type 1-ritten uitvoeren — andersom niet.
                    </p>
                  </div>
                );
              })()}
              </div>
            </details>

            <details className="group border border-brass-deep/15 bg-card">
              <summary className="cursor-pointer list-none flex items-center justify-between px-5 py-4 hover:bg-parchment/40">
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">
                  {t("request.driversSection")} <span className="text-brass-deep/40 normal-case tracking-normal font-normal">({t("common.optional")})</span>
                </p>
                <span className="text-brass-deep/50 text-xs transition-transform group-open:rotate-180">▼</span>
              </summary>
              <div className="px-5 pb-5 pt-2">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.drivers")}</label>
                    <button type="button" onClick={addDriver} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">
                      {t("request.addDriver")}
                    </button>
                  </div>
                  {drivers.length === 0 ? (
                    <p className="text-xs text-brass-deep/45">{t("request.driversHint")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {drivers.map((d, i) => (
                        <li key={i} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={d.name}
                            onChange={(e) => updateDriver(i, { name: e.target.value })}
                            placeholder={t("request.driverName")}
                            maxLength={80}
                            className="col-span-5 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                          />
                          <input
                            type="tel"
                            value={d.phone}
                            onChange={(e) => updateDriver(i, { phone: e.target.value })}
                            placeholder="+31 6 ..."
                            maxLength={30}
                            className="col-span-6 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                          />
                          <button
                            type="button"
                            onClick={() => removeDriver(i)}
                            aria-label={t("request.removeDriver")}
                            className="col-span-1 text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                          >×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.plates")}</label>
                    <button type="button" onClick={addPlate} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">
                      {t("request.addPlate")}
                    </button>
                  </div>
                  {licensePlates.length === 0 ? (
                    <p className="text-xs text-brass-deep/45">{t("request.platesHint")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {licensePlates.map((p, i) => (
                        <li key={i} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={p}
                            onChange={(e) => updatePlate(i, e.target.value)}
                            placeholder={t("request.platePlaceholder")}
                            maxLength={20}
                            className="col-span-11 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm uppercase tracking-wider tabular-nums focus:outline-none focus:border-brass-gold"
                          />
                          <button
                            type="button"
                            onClick={() => removePlate(i)}
                            aria-label={t("request.removePlate")}
                            className="col-span-1 text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                          >×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              </div>
            </details>


            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>

            <div className="border border-brass-deep/15 bg-parchment/40 p-5">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">
                Begeleider kiezen
              </p>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 p-3 cursor-pointer border transition-colors ${
                  selectionMode === "auto" ? "border-brass-gold bg-card" : "border-brass-deep/10 hover:bg-card"
                }`}>
                  <input
                    type="radio"
                    name="selectionMode"
                    value="auto"
                    checked={selectionMode === "auto"}
                    onChange={() => setSelectionMode("auto")}
                    className="mt-1 accent-brass-gold"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brass-deep">Automatisch — laat ViaCust de beste match kiezen</p>
                    <p className="text-xs text-brass-deep/65 leading-relaxed mt-1">
                      Alle geschikte begeleiders krijgen tegelijk een uitnodiging. Binnen 5 minuten
                      na de eerste beschikbaarheidsmelding wordt de best passende begeleider gekozen
                      op basis van afstand, beoordeling en eerdere samenwerking.
                    </p>
                  </div>
                </label>
                <label className={`flex items-start gap-3 p-3 cursor-pointer border transition-colors ${
                  selectionMode === "manual" ? "border-brass-gold bg-card" : "border-brass-deep/10 hover:bg-card"
                }`}>
                  <input
                    type="radio"
                    name="selectionMode"
                    value="manual"
                    checked={selectionMode === "manual"}
                    onChange={() => setSelectionMode("manual")}
                    className="mt-1 accent-brass-gold"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brass-deep">Zelf begeleider kiezen</p>
                    <p className="text-xs text-brass-deep/65 leading-relaxed mt-1">
                      Je krijgt een lijst met geschikte begeleiders en kiest zelf wie je wilt
                      uitnodigen.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              disabled={busy || !pickupGeo || !dropoffGeo}
              className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy
                ? (selectionMode === "auto" ? "Aanvraag plaatsen…" : t("request.searching"))
                : (selectionMode === "auto" ? "Aanvraag plaatsen" : t("request.search"))}
            </button>
          </form>
          )}

          <LocationPickerDialog
            open={!!pickerTarget}
            onOpenChange={(o) => { if (!o) setPickerTarget(null); }}
            title={
              pickerTarget?.kind === "main-pickup" ? "Vertrek kiezen" :
              pickerTarget?.kind === "main-dropoff" ? "Bestemming kiezen" :
              pickerTarget?.kind === "extra-pickup" ? "Vertrek vervolgrit kiezen" :
              pickerTarget?.kind === "extra-dropoff" ? "Bestemming vervolgrit kiezen" : ""
            }
            initial={
              pickerTarget?.kind === "main-pickup" ? (pickupGeo ? { lat: pickupGeo.lat, lng: pickupGeo.lng } : null) :
              pickerTarget?.kind === "main-dropoff" ? (dropoffGeo ? { lat: dropoffGeo.lat, lng: dropoffGeo.lng } : null) :
              pickerTarget?.kind === "extra-pickup" ? (extraLegs[pickerTarget.index]?.pickup ? { lat: extraLegs[pickerTarget.index].pickup!.lat, lng: extraLegs[pickerTarget.index].pickup!.lng } : null) :
              pickerTarget?.kind === "extra-dropoff" ? (extraLegs[pickerTarget.index]?.dropoff ? { lat: extraLegs[pickerTarget.index].dropoff!.lat, lng: extraLegs[pickerTarget.index].dropoff!.lng } : null) :
              null
            }
            onConfirm={(r) => {
              if (!pickerTarget) return;
              if (pickerTarget.kind === "main-pickup") onPickPickup(r);
              else if (pickerTarget.kind === "main-dropoff") onPickDropoff(r);
              else if (pickerTarget.kind === "extra-pickup") updateExtraLeg(pickerTarget.index, {
                pickup_address: r.display,
                pickup: { city: r.city, country: r.country, lat: r.lat, lng: r.lng },
              });
              else if (pickerTarget.kind === "extra-dropoff") updateExtraLeg(pickerTarget.index, {
                dropoff_address: r.display,
                dropoff: { city: r.city, country: r.country, lat: r.lat, lng: r.lng },
              });
            }}
          />

          <AlertDialog open={confirmRemovePermit} onOpenChange={setConfirmRemovePermit}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Vergunning verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  De PDF en alle ingelezen routes worden definitief verwijderd. Dit kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setConfirmRemovePermit(false);
                    await removeUploadedPermit();
                  }}
                >
                  Verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("request.startOverTitle", { defaultValue: "Concept wissen?" })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("request.startOverBody", { defaultValue: "Alle ingevulde gegevens van deze ritaanvraag worden gewist. De geüploade ontheffing blijft bewaard in je vergunningen." })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel", { defaultValue: "Annuleren" })}</AlertDialogCancel>
                <AlertDialogAction onClick={resetDraft}>
                  {t("request.startOver", { defaultValue: "Begin opnieuw" })}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {matches && pickupGeo && dropoffGeo && (
            <Matches
              matches={matches}
              numWanted={form.num_escorts}
              hourlyRideMin={travelMinutes(distanceKm(pickupGeo, dropoffGeo))}
              onBook={bookEscorts}
              busy={busy}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Matches = ({
  matches, numWanted, hourlyRideMin, onBook, busy,
}: {
  matches: MatchedEscort[];
  numWanted: number;
  hourlyRideMin: number;
  onBook: (selected: MatchedEscort[]) => void;
  busy: boolean;
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [fuelEscort, setFuelEscort] = useState<MatchedEscort | null>(null);
  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < numWanted ? [...s, id] : s
    );
  };
  const anySelectedConflict = false;
  const availableMatches = matches.filter((m) => !m.conflict);
  return (
    <section className="mt-12">
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">{t("request.matchesKicker")}</p>
      <h2 className="font-display text-3xl text-brass-deep italic mb-2">{t("request.matchesTitle")}</h2>
      <p className="text-sm text-brass-deep/60 mb-6">
        <Trans i18nKey="request.matchesBody" values={{ n: numWanted }} components={{ strong: <strong /> }} />
      </p>

      {availableMatches.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-brass-deep/60">{t("request.noMatches")}</p>
          <p className="text-xs text-brass-deep/50">
            Geen geschikte begeleiders gevonden?{" "}
            <a href="mailto:support@viacust.com" className="text-brass-gold hover:text-brass-deep underline">
              support@viacust.com
            </a>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {availableMatches.map((m) => {
            const isSelected = selected.includes(m.id);
            return (
              <li key={m.id} onClick={() => toggle(m.id)}
                className={`flex items-center justify-between gap-3 bg-card px-4 py-3 cursor-pointer transition-all border ${
                  isSelected ? "border-brass-gold ring-1 ring-brass-gold" : "border-brass-deep/10 hover:bg-parchment"
                }`}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`size-3.5 rounded-full shrink-0 ${
                    isSelected ? "bg-brass-gold" : "bg-patina"
                  }`} />
                  <p className="font-display text-lg text-brass-deep tabular-nums shrink-0">#{m.anonymous_id}</p>
                  {m.is_favorite && (
                    <span title="Favoriete begeleider" className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-brass-gold text-parchment shrink-0">
                      ★ Favoriet
                    </span>
                  )}
                  {hasFuelSurcharge(m.fuel_surcharge) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFuelEscort(m); }}
                      title="Brandstoftoeslag bekijken"
                      className="text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 bg-brass-deep/10 text-brass-deep hover:bg-brass-deep hover:text-parchment shrink-0 transition-colors"
                    >
                      ⛽ Brandstoftoeslag
                    </button>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-brass-deep/70">
                    <span>{t("request.travelIn")} <strong className="text-brass-deep">{fmtHours(m.travelToPickupMin)}</strong></span>
                    <span>{t("request.travelOut")} <strong className="text-brass-deep">{fmtHours(m.travelBackHomeMin)}</strong></span>
                  </div>
                </div>
                <p className="text-sm font-semibold tabular-nums text-brass-deep shrink-0">€{m.effective_rate.toFixed(2)}/u</p>
              </li>
            );
          })}
        </ul>
      )}

      <FuelSurchargeDialog escort={fuelEscort} onClose={() => setFuelEscort(null)} />

      <button onClick={() => onBook(matches.filter((m) => selected.includes(m.id)))}
        disabled={busy || selected.length !== numWanted || anySelectedConflict}
        className="mt-4 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
        {busy ? t("request.booking") : t("request.book", { sel: selected.length, want: numWanted })}
      </button>
    </section>
  );
};

const FuelSurchargeDialog = ({
  escort, onClose,
}: { escort: MatchedEscort | null; onClose: () => void }) => {
  const open = !!escort;
  const fs = escort?.fuel_surcharge ?? null;
  const tiers = (fs?.tiers ?? []).filter((t) => t && (t.from !== undefined || t.to !== undefined || t.value !== undefined));
  const isPercent = fs?.kind === "percent";
  const fmtRange = (from?: string | number, to?: string | number) => {
    const f = from === undefined || from === "" ? "0" : String(from);
    const tt = to === undefined || to === "" ? "∞" : String(to);
    return `€ ${f} – € ${tt}`;
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Brandstoftoeslag — #{escort?.anonymous_id}</DialogTitle>
          <DialogDescription>
            Deze begeleider rekent een brandstoftoeslag bovenop het uurtarief, afhankelijk van de
            actuele dieselprijs (€ per liter, excl. btw).
          </DialogDescription>
        </DialogHeader>
        {tiers.length === 0 ? (
          <p className="text-sm text-brass-deep/60">Geen drempels opgegeven.</p>
        ) : (
          <div className="border border-brass-deep/15">
            <div className="grid grid-cols-12 text-[10px] uppercase tracking-widest font-bold text-brass-deep/55 bg-parchment px-3 py-2 border-b border-brass-deep/15">
              <div className="col-span-8">Dieselprijs / liter</div>
              <div className="col-span-4 text-right">{isPercent ? "% uurtarief" : "€ / uur"}</div>
            </div>
            <ul className="divide-y divide-brass-deep/10">
              {tiers.map((tier, i) => (
                <li key={i} className="grid grid-cols-12 px-3 py-2 text-sm tabular-nums">
                  <div className="col-span-8">{fmtRange(tier.from, tier.to)}</div>
                  <div className="col-span-4 text-right font-semibold">
                    {isPercent ? `${tier.value ?? 0}%` : `€ ${tier.value ?? 0}`}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-[11px] text-brass-deep/55 leading-relaxed">
          De toeslag wordt berekend op basis van de wekelijkse dieselprijs van het land waarin
          gereden wordt en verschijnt als aparte regel op de factuur.
        </p>
      </DialogContent>
    </Dialog>
  );
};


const Input = ({
  label, value, onChange, type = "text", placeholder, step, inputMode, min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url" | "none";
  min?: string;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{label}</label>
    <input
      type={type} value={value} placeholder={placeholder} step={step} inputMode={inputMode} min={min}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
    />
  </div>
);

const RequestRide = () => (
  <RequireAuth>
    <RequireSubscription action="ritten aan te maken">
      <RequestRideInner />
    </RequireSubscription>
  </RequireAuth>
);

export default RequestRide;
