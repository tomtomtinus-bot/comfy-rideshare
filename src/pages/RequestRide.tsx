import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { distanceKm, travelMinutes } from "@/lib/geo";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";

const schema = z.object({
  pickup_address: z.string().trim().min(2).max(200),
  dropoff_address: z.string().trim().min(2).max(200),
  scheduled_at: z.string().min(1),
  num_escorts: z.coerce.number().int().min(1).max(15),
  notes: z.string().trim().max(500).optional(),
  cargo_length_m: z.coerce.number().min(0).max(120).optional().or(z.literal("").transform(() => undefined)),
  cargo_width_m: z.coerce.number().min(0).max(15).optional().or(z.literal("").transform(() => undefined)),
  cargo_height_m: z.coerce.number().min(0).max(8).optional().or(z.literal("").transform(() => undefined)),
  cargo_weight_t: z.coerce.number().min(0).max(500).optional().or(z.literal("").transform(() => undefined)),
  permit_number: z.string().trim().max(60).optional(),
});

interface MatchedEscort {
  id: string;
  anonymous_id: string;
  base_city: string;
  base_lat: number;
  base_lng: number;
  hourly_rate: number;
  rating: number;
  rides_completed: number;
  countries: string[];
  distanceToPickup: number;
  distanceFromDropoff: number;
  travelToPickupMin: number;
  travelBackHomeMin: number;
}

interface GeoPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

const RequestRideInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchedEscort[] | null>(null);

  const [pickupGeo, setPickupGeo] = useState<GeoPoint | null>(null);
  const [dropoffGeo, setDropoffGeo] = useState<GeoPoint | null>(null);

  const [form, setForm] = useState({
    pickup_address: "",
    dropoff_address: "",
    scheduled_at: "",
    num_escorts: 1,
    notes: "",
    cargo_length_m: "25",
    cargo_width_m: "4",
    cargo_height_m: "4.2",
    cargo_weight_t: "60",
    permit_number: "",
  });

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

    setBusy(true);
    const { data, error } = await supabase
      .from("escort_profiles")
      .select("id, anonymous_id, base_city, base_lat, base_lng, hourly_rate, rating, rides_completed, countries, available")
      .eq("available", true);
    setBusy(false);
    if (error) return toast.error(error.message);

    const ranked: MatchedEscort[] = (data ?? [])
      .filter((e) => e.countries.includes(pickupGeo.country) && e.countries.includes(dropoffGeo.country))
      .map((e) => {
        const dPickup = distanceKm({ lat: e.base_lat, lng: e.base_lng }, pickupGeo);
        const dDropoff = distanceKm({ lat: e.base_lat, lng: e.base_lng }, dropoffGeo);
        return {
          ...e,
          distanceToPickup: dPickup,
          distanceFromDropoff: dDropoff,
          travelToPickupMin: travelMinutes(dPickup),
          travelBackHomeMin: travelMinutes(dDropoff),
        };
      })
      .sort((a, b) => Math.min(a.distanceToPickup, a.distanceFromDropoff) - Math.min(b.distanceToPickup, b.distanceFromDropoff))
      .slice(0, 3);

    if (ranked.length === 0) return toast.error("Geen beschikbare begeleiders gevonden");
    setMatches(ranked);
  };

  const bookEscorts = async (selected: MatchedEscort[]) => {
    if (!user || !pickupGeo || !dropoffGeo) return;
    if (selected.length !== form.num_escorts) {
      return toast.error(`Selecteer precies ${form.num_escorts} begeleider(s)`);
    }

    const rideKm = distanceKm(pickupGeo, dropoffGeo);
    const rideMin = travelMinutes(rideKm);

    setBusy(true);
    const APP_FEE_PER_ESCORT = 2.5;
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
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        num_escorts: form.num_escorts,
        notes: form.notes || null,
        status: "open",
        app_fee: +(APP_FEE_PER_ESCORT * form.num_escorts).toFixed(2),
        cargo_length_m: parseFloat(form.cargo_length_m) || 0,
        cargo_width_m: parseFloat(form.cargo_width_m) || 0,
        cargo_height_m: parseFloat(form.cargo_height_m) || 0,
        cargo_weight_t: parseFloat(form.cargo_weight_t) || 0,
        permit_number: form.permit_number || null,
        time_window_start: new Date(form.scheduled_at).toISOString(),
        time_window_end: null,
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
        estimated_cost: +(hours * e.hourly_rate).toFixed(2),
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
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">Lading & vergunning</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="Lengte (m)" inputMode="decimal" value={form.cargo_length_m} onChange={(v) => setForm({ ...form, cargo_length_m: v })} placeholder="bv. 25.50" />
                <Input label="Breedte (m)" inputMode="decimal" value={form.cargo_width_m} onChange={(v) => setForm({ ...form, cargo_width_m: v })} placeholder="bv. 4.20" />
                <Input label="Hoogte (m)" inputMode="decimal" value={form.cargo_height_m} onChange={(v) => setForm({ ...form, cargo_height_m: v })} placeholder="bv. 4.20" />
                <Input label="Gewicht (ton)" inputMode="numeric" value={form.cargo_weight_t} onChange={(v) => setForm({ ...form, cargo_weight_t: v })} placeholder="bv. 60" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input label="Vergunningnummer (optioneel)" value={form.permit_number} onChange={(v) => setForm({ ...form, permit_number: v })} placeholder="Bijv. XV-2026-0421" />
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Aantal begeleiders (max 15)</label>
                  <input
                    type="number" min={1} max={15}
                    value={form.num_escorts}
                    onChange={(e) => setForm({ ...form, num_escorts: Math.min(15, Math.max(1, +e.target.value || 1)) })}
                    className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                  />
                </div>
              </div>
            </section>

            <section className="border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-4">Starttijd</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Geplande starttijd" type="datetime-local" value={form.scheduled_at} onChange={(v) => setForm({ ...form, scheduled_at: v })} />
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
  const [selected, setSelected] = useState<string[]>(matches.slice(0, numWanted).map((m) => m.id));
  const toggle = (id: string) => {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < numWanted ? [...s, id] : s
    );
  };
  return (
    <section className="mt-12">
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">Voorgestelde begeleiders</p>
      <h2 className="font-display text-3xl text-brass-deep italic mb-2">Dichtstbijzijnde anonieme begeleiders</h2>
      <p className="text-sm text-brass-deep/60 mb-6">
        Selecteer er {numWanted}. <strong>Servicekosten: €2,50 per begeleider</strong> (€{(2.5 * numWanted).toFixed(2)} totaal).
      </p>

      <ul className="space-y-px bg-brass-deep/10">
        {matches.map((m) => {
          const isSelected = selected.includes(m.id);
          return (
            <li key={m.id} onClick={() => toggle(m.id)}
              className={`bg-card p-6 cursor-pointer transition-all ${isSelected ? "ring-2 ring-inset ring-brass-gold" : "hover:bg-parchment"}`}>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-4">
                  <p className="font-display text-2xl text-brass-deep tabular-nums">#{m.anonymous_id}</p>
                  <p className="text-xs text-brass-deep/55 mt-1">★ {m.rating} · {m.rides_completed} ritten</p>
                </div>
                <Cell label="Aanrijden" value={`${m.travelToPickupMin} min`} />
                <Cell label="Afrijden" value={`${m.travelBackHomeMin} min`} />
                <Cell label="Tarief" value={`€${m.hourly_rate}/u`} />
                <div className="col-span-12 md:col-span-1 text-right">
                  <span className={`size-5 inline-block rounded-full ${isSelected ? "bg-brass-gold" : "bg-patina"}`} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button onClick={() => onBook(matches.filter((m) => selected.includes(m.id)))}
        disabled={busy || selected.length !== numWanted}
        className="mt-8 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60">
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
