import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { distanceKm, travelMinutes, emptyTravelMinutes } from "@/lib/geo";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";

const schema = z.object({
  pickup_address: z.string().trim().min(2).max(200),
  dropoff_address: z.string().trim().min(2).max(200),
  scheduled_date: z.string().min(1, "Datum vereist"),
  scheduled_time: z.string().min(1, "Tijd vereist"),
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
  effective_rate: number;
  is_be_ride: boolean;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchedEscort[] | null>(null);

  const [pickupGeo, setPickupGeo] = useState<GeoPoint | null>(null);
  const [dropoffGeo, setDropoffGeo] = useState<GeoPoint | null>(null);

  const [permits, setPermits] = useState<{ id: string; permit_number: string; carrier: string | null; valid_to: string | null }[]>([]);
  const [selectedPermitId, setSelectedPermitId] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("permits")
      .select("id, permit_number, carrier, valid_to")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPermits((data ?? []) as any));
  }, [user]);

  const [form, setForm] = useState({
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
  });

  const [drivers, setDrivers] = useState<{ name: string; phone: string }[]>([]);
  const [licensePlates, setLicensePlates] = useState<string[]>([]);

  const addDriver = () => setDrivers((d) => [...d, { name: "", phone: "" }]);
  const updateDriver = (i: number, patch: Partial<{ name: string; phone: string }>) =>
    setDrivers((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const removeDriver = (i: number) => setDrivers((d) => d.filter((_, idx) => idx !== i));

  const addPlate = () => setLicensePlates((p) => [...p, ""]);
  const updatePlate = (i: number, v: string) =>
    setLicensePlates((p) => p.map((x, idx) => (idx === i ? v.toUpperCase() : x)));
  const removePlate = (i: number) => setLicensePlates((p) => p.filter((_, idx) => idx !== i));

  // Auto-fill velden vanuit gekozen ontheffing
  useEffect(() => {
    if (!selectedPermitId) return;
    const p = permits.find((x) => x.id === selectedPermitId);
    if (p) setForm((f) => ({ ...f, permit_number: p.permit_number }));
  }, [selectedPermitId, permits]);

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
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!pickupGeo || !dropoffGeo) return toast.error("Postcodes nog niet bevestigd");
    const [hh, mm] = form.scheduled_time.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm) || mm % 15 !== 0) return toast.error("Starttijd moet op het kwartier vallen (00, 15, 30, 45)");

    setBusy(true);
    const { data, error } = await supabase
      .from("escort_profiles")
      .select("id, anonymous_id, base_city, base_lat, base_lng, hourly_rate, hourly_rate_be, rating, rides_completed, countries, available")
      .eq("available", true);
    setBusy(false);
    if (error) return toast.error(error.message);

    // Grenslocaties als "NL/BE" splitsen we naar beide landen; begeleider moet minstens één van de landen dekken
    const expandCountries = (c: string): string[] => {
      const map: Record<string, string> = { NL: "Nederland", BE: "België", DE: "Duitsland", FR: "Frankrijk" };
      return c.split("/").map((p) => map[p.trim()] ?? p.trim());
    };
    const pickupCountries = expandCountries(pickupGeo.country);
    const dropoffCountries = expandCountries(dropoffGeo.country);

    const rideKm = distanceKm(pickupGeo, dropoffGeo);
    const rideMin = travelMinutes(rideKm);
    const scheduledISO = new Date(`${form.scheduled_date}T${form.scheduled_time}`).toISOString();
    const rideStartMs = new Date(scheduledISO).getTime();

    const ranked: MatchedEscort[] = (data ?? [])
      .filter((e) =>
        pickupCountries.some((c) => e.countries.includes(c)) &&
        dropoffCountries.some((c) => e.countries.includes(c))
      )
      .map((e) => {
        const dPickup = distanceKm({ lat: e.base_lat, lng: e.base_lng }, pickupGeo);
        const dDropoff = distanceKm({ lat: e.base_lat, lng: e.base_lng }, dropoffGeo);
        const isBe = pickupGeo.country.includes("BE") || dropoffGeo.country.includes("BE");
        return {
          ...e,
          distanceToPickup: dPickup,
          distanceFromDropoff: dDropoff,
          travelToPickupMin: emptyTravelMinutes(dPickup),
          travelBackHomeMin: emptyTravelMinutes(dDropoff),
          is_be_ride: isBe,
          effective_rate: isBe ? Number(e.hourly_rate_be ?? e.hourly_rate) : Number(e.hourly_rate),
          conflict: null,
        } as MatchedEscort;
      })
      .sort((a, b) => Math.min(a.distanceToPickup, a.distanceFromDropoff) - Math.min(b.distanceToPickup, b.distanceFromDropoff))
      .slice(0, 8);

    if (ranked.length === 0) return toast.error("Geen beschikbare begeleiders gevonden");

    // Bezetting (overlap met bestaande aanvragen) per begeleider ophalen
    const withConflicts = await Promise.all(ranked.map(async (m) => {
      const myStartMs = rideStartMs - m.travelToPickupMin * 60_000;
      const myEndMs = rideStartMs + rideMin * 60_000 + m.travelBackHomeMin * 60_000;
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
      return toast.error(`Selecteer precies ${form.num_escorts} begeleider(s)`);
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
        permit_id: selectedPermitId || null,
        client_reference: form.client_reference || null,
        time_window_start: scheduledISO,
        time_window_end: null,
        drivers: drivers
          .map((d) => ({ name: d.name.trim(), phone: d.phone.trim() }))
          .filter((d) => d.name || d.phone) as never,
        license_plates: licensePlates.map((p) => p.trim()).filter(Boolean),
      })
      .select()
      .single();

    if (error || !ride) {
      setBusy(false);
      return toast.error(error?.message ?? "Fout bij aanmaken rit");
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

    toast.success("Rit geboekt");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-5xl mx-auto">
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-4">
            Nieuwe konvooi-aanvraag
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-brass-deep italic leading-[0.95] mb-12">
            Van A naar B — vraag begeleiding aan.
          </h1>

          {!isApproved ? (
            <div className="bg-card shadow-etched p-8 md:p-10 border-l-4 border-brass-gold">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">
                Account in afwachting
              </p>
              <h2 className="font-display text-2xl text-brass-deep mb-3">
                Goedkeuring vereist
              </h2>
              <p className="text-brass-deep/75 text-sm leading-relaxed">
                Je kunt pas ritten aanvragen zodra een beheerder je account heeft goedgekeurd.
                Vul ondertussen je <Link to="/facturatiegegevens" className="underline font-semibold">facturatiegegevens</Link> alvast in.
              </p>
            </div>
          ) : (
          <form onSubmit={findMatches} className="bg-card shadow-etched p-8 md:p-10 space-y-8">
            <section>
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">Route</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-parchment/40 p-4 border border-brass-deep/10">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-3">A · Vertrek</p>
                  <AddressAutocomplete
                    label="Adres of stad"
                    value={form.pickup_address}
                    onChange={(v) => setForm({ ...form, pickup_address: v })}
                    onSelect={onPickPickup}
                    placeholder="Bv. Hafenstraße 12, Duisburg"
                  />
                  {pickupGeo && (
                    <p className="text-[11px] text-brass-deep/60 mt-1">📍 {pickupGeo.city}, {pickupGeo.country}</p>
                  )}
                </div>
                <div className="bg-parchment/40 p-4 border border-brass-deep/10">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-3">B · Bestemming</p>
                  <AddressAutocomplete
                    label="Adres of stad"
                    value={form.dropoff_address}
                    onChange={(v) => setForm({ ...form, dropoff_address: v })}
                    onSelect={onPickDropoff}
                    placeholder="Bv. Havenweg 8, Rotterdam"
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
                      Geschatte ritduur
                    </p>
                    <p className="text-sm text-brass-deep">
                      <strong className="tabular-nums">{Math.round(km)} km</strong> ·{" "}
                      <strong className="tabular-nums">{fmtHours(min)}</strong>{" "}
                      <span className="text-brass-deep/55">(70 km/u beladen, leegrijden 100 km/u)</span>
                    </p>
                  </div>
                );
              })()}
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">Lading & vergunning <span className="text-brass-deep/40 normal-case tracking-normal font-normal">(optioneel)</span></p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="Lengte (m)" inputMode="decimal" value={form.cargo_length_m} onChange={(v) => setForm({ ...form, cargo_length_m: v })} placeholder="bv. 25.50" />
                <Input label="Breedte (m)" inputMode="decimal" value={form.cargo_width_m} onChange={(v) => setForm({ ...form, cargo_width_m: v })} placeholder="bv. 4.20" />
                <Input label="Hoogte (m)" inputMode="decimal" value={form.cargo_height_m} onChange={(v) => setForm({ ...form, cargo_height_m: v })} placeholder="bv. 4.20" />
                <Input label="Gewicht (ton)" inputMode="numeric" value={form.cargo_weight_t} onChange={(v) => setForm({ ...form, cargo_weight_t: v })} placeholder="bv. 60" />
              </div>
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">RDW Ontheffing</label>
                <div className="mt-1 flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedPermitId}
                    onChange={(e) => setSelectedPermitId(e.target.value)}
                    className="flex-1 bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  >
                    <option value="">— Geen ontheffing kiezen —</option>
                    {permits.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.permit_number}{p.carrier ? ` · ${p.carrier}` : ""}{p.valid_to ? ` (t/m ${new Date(p.valid_to).toLocaleDateString("nl-NL")})` : ""}
                      </option>
                    ))}
                  </select>
                  <Link
                    to="/ontheffingen"
                    className="px-4 py-3 text-xs uppercase tracking-widest font-semibold text-brass-deep border border-brass-deep/20 hover:bg-brass-deep hover:text-parchment text-center"
                  >
                    + Nieuwe uploaden
                  </Link>
                </div>
                {selectedPermitId && (
                  <p className="text-[11px] text-brass-deep/60 mt-1">
                    De begeleider ziet de routebeschrijving uit deze ontheffing.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Input label="Vergunningnummer (handmatig)" value={form.permit_number} onChange={(v) => setForm({ ...form, permit_number: v })} placeholder="Auto ingevuld bij ontheffing" />
                <Input label="Eigen referentie (optioneel)" value={form.client_reference} onChange={(v) => setForm({ ...form, client_reference: v })} placeholder="Bijv. PO-2026-118" />
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Aantal begeleiders</label>
                  <div className="mt-1 flex items-stretch border border-brass-deep/15 bg-parchment">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, num_escorts: Math.max(1, form.num_escorts - 1) })}
                      className="px-4 text-lg font-bold text-brass-deep hover:bg-brass-gold/10"
                      aria-label="Minder begeleiders"
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
                      aria-label="Meer begeleiders"
                    >+</button>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">
                Chauffeurs & kentekens <span className="text-brass-deep/40 normal-case tracking-normal font-normal">(optioneel)</span>
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Chauffeurs</label>
                    <button type="button" onClick={addDriver} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">
                      + Chauffeur toevoegen
                    </button>
                  </div>
                  {drivers.length === 0 ? (
                    <p className="text-xs text-brass-deep/45">Voeg naam en telefoonnummer toe van de chauffeur(s).</p>
                  ) : (
                    <ul className="space-y-2">
                      {drivers.map((d, i) => (
                        <li key={i} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={d.name}
                            onChange={(e) => updateDriver(i, { name: e.target.value })}
                            placeholder="Naam"
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
                            aria-label="Verwijder chauffeur"
                            className="col-span-1 text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                          >×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Kentekens</label>
                    <button type="button" onClick={addPlate} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">
                      + Kenteken toevoegen
                    </button>
                  </div>
                  {licensePlates.length === 0 ? (
                    <p className="text-xs text-brass-deep/45">Bijv. trekker en oplegger.</p>
                  ) : (
                    <ul className="space-y-2">
                      {licensePlates.map((p, i) => (
                        <li key={i} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            value={p}
                            onChange={(e) => updatePlate(i, e.target.value)}
                            placeholder="Bv. 12-AB-345"
                            maxLength={20}
                            className="col-span-11 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm uppercase tracking-wider tabular-nums focus:outline-none focus:border-brass-gold"
                          />
                          <button
                            type="button"
                            onClick={() => removePlate(i)}
                            aria-label="Verwijder kenteken"
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
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">Geplande starttijd</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Datum" type="date" value={form.scheduled_date} onChange={(v) => setForm({ ...form, scheduled_date: v })} />
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Tijd (per kwartier)</label>
                  <select
                    value={form.scheduled_time}
                    onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  >
                    <option value="" disabled>Kies tijd…</option>
                    {QUARTER_TIMES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Opmerkingen (optioneel)</label>
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
              {busy ? "Zoeken…" : "Zoek dichtstbijzijnde begeleiders"}
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
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < numWanted ? [...s, id] : s
    );
  };
  const fmtDT = (iso: string) => new Date(iso).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  const anySelectedConflict = matches.some((m) => selected.includes(m.id) && m.conflict);
  return (
    <section className="mt-12">
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">Voorgestelde begeleiders</p>
      <h2 className="font-display text-3xl text-brass-deep italic mb-2">Dichtstbijzijnde anonieme begeleiders</h2>
      <p className="text-sm text-brass-deep/60 mb-6">
        Selecteer er {numWanted} zelf. <strong>Servicekosten: 1,5% van het ritbedrag</strong> (wekelijks gefactureerd).
      </p>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.map((m) => {
          const isSelected = selected.includes(m.id);
          const totalMin = m.travelToPickupMin + hourlyRideMin + m.travelBackHomeMin;
          const conflict = m.conflict;
          return (
            <li key={m.id} onClick={() => toggle(m.id)}
              className={`bg-card p-4 cursor-pointer transition-all border ${
                conflict ? "border-destructive/60 ring-1 ring-destructive/40" :
                isSelected ? "border-brass-gold ring-1 ring-brass-gold" : "border-brass-deep/10 hover:bg-parchment"
              }`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-display text-xl text-brass-deep tabular-nums">#{m.anonymous_id}</p>
                  <p className="text-[11px] text-brass-deep/55 mt-0.5">★ {m.rating} · {m.rides_completed} ritten</p>
                </div>
                <span className={`size-4 mt-1 inline-block rounded-full shrink-0 ${
                  conflict ? "bg-destructive" : isSelected ? "bg-brass-gold" : "bg-patina"
                }`} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                <MiniCell label="Aanrij" value={fmtHours(m.travelToPickupMin)} />
                <MiniCell label="Rit" value={fmtHours(hourlyRideMin)} />
                <MiniCell label="Afrij" value={fmtHours(m.travelBackHomeMin)} />
                <MiniCell label="Totaal" value={fmtHours(totalMin)} bold />
              </div>
              <p className="text-[10px] text-brass-deep/55 mt-2">
                Tarief {m.is_be_ride ? "BE" : "NL"}: €{m.effective_rate}/u
              </p>
              {conflict && (
                <div className="mt-2 bg-destructive/10 border border-destructive/40 px-2 py-1.5">
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-widest">⚠ Bezet</p>
                  <p className="text-[11px] text-brass-deep mt-0.5">
                    Overlap {fmtDT(conflict.overlapStart)} – {fmtDT(conflict.overlapEnd)}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {anySelectedConflict && (
        <p className="mt-4 text-sm text-destructive font-semibold">
          ⚠ Eén of meer geselecteerde begeleiders zijn al bezet. Deselecteer hen om te kunnen boeken.
        </p>
      )}

      <button onClick={() => onBook(matches.filter((m) => selected.includes(m.id)))}
        disabled={busy || selected.length !== numWanted || anySelectedConflict}
        className="mt-4 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
        {busy ? "Boeken…" : `Boek ${selected.length}/${numWanted} begeleider(s)`}
      </button>
    </section>
  );
};

const Cell = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="col-span-6 md:col-span-2 text-sm">
    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{label}</p>
    <p className={`tabular-nums ${bold ? "font-semibold" : "font-medium"}`}>{value}</p>
  </div>
);

const MiniCell = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div>
    <p className="text-[9px] uppercase tracking-wider text-brass-deep/50 font-bold">{label}</p>
    <p className={`tabular-nums ${bold ? "font-semibold text-brass-deep" : "text-brass-deep/80"}`}>{value}</p>
  </div>
);

const Input = ({
  label, value, onChange, type = "text", placeholder, step, inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  step?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url" | "none";
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{label}</label>
    <input
      type={type} value={value} placeholder={placeholder} step={step} inputMode={inputMode}
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
