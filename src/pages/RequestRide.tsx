import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { distanceKm, travelMinutes, emptyTravelMinutes } from "@/lib/geo";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";
import { uploadPermitPdf } from "@/lib/uploadPermit";
import { Loader2, Upload, X, FileText } from "lucide-react";

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
  distanceToPickup: number;
  distanceFromDropoff: number;
  travelToPickupMin: number;
  travelBackHomeMin: number;
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

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        form, pickupGeo, dropoffGeo, uploadedPermit, drivers, licensePlates,
      }));
    } catch {}
  }, [form, pickupGeo, dropoffGeo, uploadedPermit, drivers, licensePlates]);

  const addDriver = () => setDrivers((d) => [...d, { name: "", phone: "" }]);
  const updateDriver = (i: number, patch: Partial<{ name: string; phone: string }>) =>
    setDrivers((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeDriver = (i: number) => setDrivers((d) => d.filter((_, idx) => idx !== i));

  const addPlate = () => setLicensePlates((p) => [...p, ""]);
  const updatePlate = (i: number, v: string) =>
    setLicensePlates((p) => p.map((x, idx) => (idx === i ? v.toUpperCase() : x)));
  const removePlate = (i: number) => setLicensePlates((p) => p.filter((_, idx) => idx !== i));

  // Auto-fill vergunningnummer zodra een ontheffing is geüpload
  useEffect(() => {
    if (!uploadedPermit) return;
    setForm((f) => ({ ...f, permit_number: uploadedPermit.permit_number }));
  }, [uploadedPermit]);

  const handlePermitFile = async (file: File | null) => {
    if (!file || !user) return;
    setPermitUploading(true);
    try {
      toast.info(t("request.permitRead"));
      const up = await uploadPermitPdf(file, user.id);
      setUploadedPermit(up);
      toast.success(t("request.permitUploaded", { nr: up.permit_number, n: up.routes_count }));
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

  const findMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = makeSchema(t).safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!pickupGeo || !dropoffGeo) return toast.error(t("request.postcodesPending"));
    const [hh, mm] = form.scheduled_time.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm) || mm % 15 !== 0) return toast.error(t("request.startQuarter"));
    const scheduledDate = new Date(`${form.scheduled_date}T${form.scheduled_time}`);
    if (isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      return toast.error(t("request.pastNotAllowed", { defaultValue: "Starttijd moet in de toekomst liggen." }));
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("escort_profiles")
      .select("id, anonymous_id, base_city, base_lat, base_lng, hourly_rate, hourly_rate_be, hourly_rate_de, hourly_rate_fr, hourly_rate_lu, km_rate_de, rating, rides_completed, countries, categories, available")
      .eq("available", true);
    setBusy(false);
    if (error) return toast.error(error.message);

    // Grenslocaties als "NL/BE" splitsen we naar beide landen; begeleider moet minstens één van de landen dekken
    const expandCountries = (c: string): string[] => {
      const map: Record<string, string> = { NL: "Nederland", BE: "België", DE: "Duitsland", FR: "Frankrijk", LU: "Luxemburg" };
      return c.split("/").map((p) => map[p.trim()] ?? p.trim());
    };
    const pickupCountries = expandCountries(pickupGeo.country);
    const dropoffCountries = expandCountries(dropoffGeo.country);

    const rideKm = distanceKm(pickupGeo, dropoffGeo);
    const rideMin = travelMinutes(rideKm);
    const scheduledISO = new Date(`${form.scheduled_date}T${form.scheduled_time}`).toISOString();
    const rideStartMs = new Date(scheduledISO).getTime();

    // België-vereiste: type 2 begeleider mag ook een type 1 rit doen, maar niet andersom
    const beInvolved = [...pickupCountries, ...dropoffCountries].includes("België");
    const beTypeRequired = beInvolved ? form.be_escort_type : null;
    const escortHasBeQualification = (cats: string[] | null): boolean => {
      const c = cats ?? [];
      if (!beTypeRequired) return true;
      if (beTypeRequired === "type2") return c.includes("be-2");
      return c.includes("be-1") || c.includes("be-2");
    };

    const ranked: MatchedEscort[] = (data ?? [])
      .filter((e) =>
        pickupCountries.some((c) => (e.countries ?? []).includes(c)) &&
        dropoffCountries.some((c) => (e.countries ?? []).includes(c)) &&
        escortHasBeQualification((e as any).categories ?? [])
      )
      .map((e) => {
        const dPickup = distanceKm({ lat: e.base_lat, lng: e.base_lng }, pickupGeo);
        const dDropoff = distanceKm({ lat: e.base_lat, lng: e.base_lng }, dropoffGeo);
        const allCountries = [...pickupCountries, ...dropoffCountries];
        const isBe = allCountries.includes("België");
        const isDe = allCountries.includes("Duitsland");
        const isFr = allCountries.includes("Frankrijk");
        const isLu = allCountries.includes("Luxemburg");
        const kmRateDe = (e as any).km_rate_de == null ? null : Number((e as any).km_rate_de);
        const deKmMode = isDe && kmRateDe != null && kmRateDe > 0;
        // Volgorde: meest specifiek land bepaalt het tarief
        let rate = Number(e.hourly_rate);
        if (isLu) rate = Number((e as any).hourly_rate_lu ?? e.hourly_rate);
        else if (isFr) rate = Number((e as any).hourly_rate_fr ?? e.hourly_rate);
        else if (isDe) rate = deKmMode ? Number(kmRateDe) : Number((e as any).hourly_rate_de ?? e.hourly_rate);
        else if (isBe) rate = Number(e.hourly_rate_be ?? e.hourly_rate);
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
          conflict: null,
        } as MatchedEscort;
      })
      .sort((a, b) => Math.min(a.distanceToPickup, a.distanceFromDropoff) - Math.min(b.distanceToPickup, b.distanceFromDropoff))
      .slice(0, 8);

    if (ranked.length === 0) return toast.error(t("request.noEscorts"));

    // Bezetting: alleen pure ritvenster (zonder reistijd), alleen ViaCust-ritten.
    const withConflicts = await Promise.all(ranked.map(async (m) => {
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
  };

  const bookEscorts = async (selected: MatchedEscort[]) => {
    if (!user || !pickupGeo || !dropoffGeo) return;
    if (selected.length !== form.num_escorts) {
      return toast.error(t("request.pickExact", { n: form.num_escorts }));
    }

    const rideKm = distanceKm(pickupGeo, dropoffGeo);
    const rideMin = travelMinutes(rideKm);

    setBusy(true);
    
    const scheduledISO = new Date(`${form.scheduled_date}T${form.scheduled_time}`).toISOString();
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
        time_window_end: null,
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
    setBusy(false);
    if (aErr) return toast.error(aErr.message);

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
          <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[0.95] mb-12">
            {t("request.title")}
          </h1>

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
            <section>
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">{t("request.route")}</p>
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
                  </div>
                );
              })()}
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">{t("request.cargoSection")} <span className="text-brass-deep/40 normal-case tracking-normal font-normal">({t("common.optional")})</span></p>
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
                        {t("request.permitAttached", { n: uploadedPermit.routes_count })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeUploadedPermit}
                      className="p-1.5 text-brass-deep/70 hover:text-brass-deep hover:bg-brass-deep/10"
                      aria-label={t("request.permitRemove")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Input label={t("request.permitNumber")} value={form.permit_number} onChange={(v) => setForm({ ...form, permit_number: v })} placeholder={t("request.permitNumberPlaceholder")} />
                <Input label={t("request.ownRef")} value={form.client_reference} onChange={(v) => setForm({ ...form, client_reference: v })} placeholder={t("request.ownRefPlaceholder")} />
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
              {(() => {
                const beInvolved =
                  (pickupGeo?.country?.includes("BE") || pickupGeo?.country?.includes("België")) ||
                  (dropoffGeo?.country?.includes("BE") || dropoffGeo?.country?.includes("België"));
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
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">
                {t("request.driversSection")} <span className="text-brass-deep/40 normal-case tracking-normal font-normal">({t("common.optional")})</span>
              </p>

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
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">{t("request.plannedStart")}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label={t("common.date")} type="date" min={new Date().toISOString().slice(0,10)} value={form.scheduled_date} onChange={(v) => setForm({ ...form, scheduled_date: v })} />
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.timeQuarter")}</label>
                  <select
                    value={form.scheduled_time}
                    onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  >
                    <option value="" disabled>{t("request.pickTime")}</option>
                    {QUARTER_TIMES.map((qt) => (
                      <option key={qt} value={qt}>{qt}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{t("request.notes")}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>

            <button
              disabled={busy || !pickupGeo || !dropoffGeo}
              className="w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy ? t("request.searching") : t("request.search")}
            </button>
          </form>
          )}

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
        <p className="text-sm text-brass-deep/60">{t("request.noMatches")}</p>
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

      <button onClick={() => onBook(matches.filter((m) => selected.includes(m.id)))}
        disabled={busy || selected.length !== numWanted || anySelectedConflict}
        className="mt-4 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
        {busy ? t("request.booking") : t("request.book", { sel: selected.length, want: numWanted })}
      </button>
    </section>
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
    <RequestRideInner />
  </RequireAuth>
);

export default RequestRide;
