import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CITIES, geocode, distanceKm, travelMinutes } from "@/lib/geo";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

const ESCORT_TYPES = ["vooroprijden", "achteroprijden", "voor+achterop", "kruispuntbegeleiding"] as const;

const schema = z.object({
  pickup_address: z.string().trim().min(3).max(200),
  pickup_city: z.string().min(1),
  dropoff_address: z.string().trim().min(3).max(200),
  dropoff_city: z.string().min(1),
  scheduled_at: z.string().min(1),
  num_escorts: z.coerce.number().int().min(1).max(5),
  notes: z.string().trim().max(500).optional(),
  cargo_length_m: z.coerce.number().min(0).max(120),
  cargo_width_m: z.coerce.number().min(0).max(15),
  cargo_height_m: z.coerce.number().min(0).max(8),
  cargo_weight_t: z.coerce.number().min(0).max(500),
  permit_number: z.string().trim().min(3).max(60),
  time_window_start: z.string().min(1),
  time_window_end: z.string().min(1),
  escort_type_required: z.enum(ESCORT_TYPES),
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

const RequestRideInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchedEscort[] | null>(null);
  const [form, setForm] = useState({
    pickup_address: "",
    pickup_city: "Rotterdam",
    dropoff_address: "",
    dropoff_city: "Amsterdam",
    scheduled_at: "",
    num_escorts: 1,
    notes: "",
    cargo_length_m: 25,
    cargo_width_m: 4,
    cargo_height_m: 4.2,
    cargo_weight_t: 60,
    permit_number: "",
    time_window_start: "",
    time_window_end: "",
    escort_type_required: "vooroprijden" as typeof ESCORT_TYPES[number],
  });

  const findMatches = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const pickupGeo = geocode(form.pickup_city);
    const dropoffGeo = geocode(form.dropoff_city);
    if (!pickupGeo || !dropoffGeo) return toast.error("Stad niet herkend");

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
      .slice(0, form.num_escorts * 3);

    if (ranked.length === 0) {
      toast.error("Geen beschikbare begeleiders gevonden voor deze regio");
      return;
    }
    setMatches(ranked);
  };

  const bookEscorts = async (selected: MatchedEscort[]) => {
    if (!user) return;
    if (selected.length !== form.num_escorts) {
      return toast.error(`Selecteer precies ${form.num_escorts} begeleider(s)`);
    }

    const pickupGeo = geocode(form.pickup_city)!;
    const dropoffGeo = geocode(form.dropoff_city)!;
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
        cargo_length_m: form.cargo_length_m,
        cargo_width_m: form.cargo_width_m,
        cargo_height_m: form.cargo_height_m,
        cargo_weight_t: form.cargo_weight_t,
        permit_number: form.permit_number,
        time_window_start: new Date(form.time_window_start).toISOString(),
        time_window_end: new Date(form.time_window_end).toISOString(),
        escort_type_required: form.escort_type_required,
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
            Vraag begeleiding aan voor uw transport.
          </h1>

          <form onSubmit={findMatches} className="bg-card shadow-etched p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Route</p>
            </div>
            <Input label="Vertrekadres" value={form.pickup_address} onChange={(v) => setForm({ ...form, pickup_address: v })} placeholder="Bijv. Maasvlakte Plaza 1" />
            <Select label="Vertrekstad" value={form.pickup_city} onChange={(v) => setForm({ ...form, pickup_city: v })} />
            <Input label="Bestemmingsadres" value={form.dropoff_address} onChange={(v) => setForm({ ...form, dropoff_address: v })} placeholder="Bijv. Hafenstraße 12, Duisburg" />
            <Select label="Bestemmingsstad" value={form.dropoff_city} onChange={(v) => setForm({ ...form, dropoff_city: v })} />

            <div className="md:col-span-2 border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Lading & vergunning</p>
            </div>
            <Input label="Lengte (m)" type="number" value={String(form.cargo_length_m)} onChange={(v) => setForm({ ...form, cargo_length_m: +v })} />
            <Input label="Breedte (m)" type="number" value={String(form.cargo_width_m)} onChange={(v) => setForm({ ...form, cargo_width_m: +v })} />
            <Input label="Hoogte (m)" type="number" value={String(form.cargo_height_m)} onChange={(v) => setForm({ ...form, cargo_height_m: +v })} />
            <Input label="Gewicht (ton)" type="number" value={String(form.cargo_weight_t)} onChange={(v) => setForm({ ...form, cargo_weight_t: +v })} />
            <Input label="Vergunningnummer (RDW/wegbeheerder)" value={form.permit_number} onChange={(v) => setForm({ ...form, permit_number: v })} placeholder="Bijv. XV-2026-0421" />
            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Type begeleiding</label>
              <select
                value={form.escort_type_required}
                onChange={(e) => setForm({ ...form, escort_type_required: e.target.value as typeof ESCORT_TYPES[number] })}
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              >
                {ESCORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 border-t border-brass-deep/10 pt-6">
              <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Tijdvenster & aantal begeleiders</p>
            </div>
            <Input label="Geplande starttijd" type="datetime-local" value={form.scheduled_at} onChange={(v) => setForm({ ...form, scheduled_at: v })} />
            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Aantal begeleiders</label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.num_escorts}
                onChange={(e) => setForm({ ...form, num_escorts: +e.target.value })}
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>
            <Input label="Tijdvenster vanaf" type="datetime-local" value={form.time_window_start} onChange={(v) => setForm({ ...form, time_window_start: v })} />
            <Input label="Tijdvenster tot" type="datetime-local" value={form.time_window_end} onChange={(v) => setForm({ ...form, time_window_end: v })} />

            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Opmerkingen (optioneel)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>
            <button
              disabled={busy}
              className="md:col-span-2 mt-2 px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
            >
              {busy ? "Zoeken…" : "Zoek dichtstbijzijnde begeleiders"}
            </button>
          </form>

          {matches && (
            <Matches
              matches={matches}
              numWanted={form.num_escorts}
              hourlyRideMin={travelMinutes(distanceKm(geocode(form.pickup_city)!, geocode(form.dropoff_city)!))}
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
  matches,
  numWanted,
  hourlyRideMin,
  onBook,
  busy,
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
      <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
        Voorgestelde begeleiders
      </p>
      <h2 className="font-display text-3xl text-brass-deep italic mb-2">
        Dichtstbijzijnde anonieme begeleiders
      </h2>
      <p className="text-sm text-brass-deep/60 mb-6">
        Selecteer er {numWanted}. Reistijd is een schatting. Begeleider wordt betaald
        van vertrek standplaats tot terugkeer thuis. <strong>Servicekosten: €2,50 per begeleider</strong> (€{(2.5 * numWanted).toFixed(2)} totaal).
        U bent voor de begeleider zichtbaar als anonieme code; de begeleider heeft 30 minuten om te accepteren.
      </p>

      <ul className="space-y-px bg-brass-deep/10">
        {matches.map((m) => {
          const isSelected = selected.includes(m.id);
          const totalMin = m.travelToPickupMin + hourlyRideMin + m.travelBackHomeMin;
          const hours = +(totalMin / 60).toFixed(2);
          const cost = (hours * m.hourly_rate).toFixed(2);
          return (
            <li
              key={m.id}
              onClick={() => toggle(m.id)}
              className={`bg-card p-6 cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-inset ring-brass-gold" : "hover:bg-parchment"
              }`}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-3">
                  <p className="font-display text-2xl text-brass-deep tabular-nums">
                    #{m.anonymous_id}
                  </p>
                  <p className="text-xs text-brass-deep/55 mt-1">★ {m.rating} · {m.rides_completed} ritten</p>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Naar A</p>
                  <p className="font-medium tabular-nums">{m.travelToPickupMin} min</p>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Terug van B</p>
                  <p className="font-medium tabular-nums">{m.travelBackHomeMin} min</p>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Tarief</p>
                  <p className="font-medium tabular-nums">€{m.hourly_rate}/u</p>
                </div>
                <div className="col-span-6 md:col-span-2 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Schatting</p>
                  <p className="font-semibold tabular-nums">€{cost}</p>
                </div>
                <div className="col-span-12 md:col-span-1 text-right">
                  <span className={`size-5 inline-block rounded-full ${isSelected ? "bg-brass-gold" : "bg-patina"}`} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => onBook(matches.filter((m) => selected.includes(m.id)))}
        disabled={busy || selected.length !== numWanted}
        className="mt-8 w-full px-6 py-4 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-60"
      >
        {busy
          ? "Boeken…"
          : `Boek ${selected.length}/${numWanted} begeleider(s)`}
      </button>
    </section>
  );
};

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
      {label}
    </label>
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
    />
  </div>
);

const Select = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
    >
      {CITIES.map((c) => (
        <option key={c.city} value={c.city}>
          {c.city}, {c.country}
        </option>
      ))}
    </select>
  </div>
);

const RequestRide = () => (
  <RequireAuth>
    <RequestRideInner />
  </RequireAuth>
);

export default RequestRide;
