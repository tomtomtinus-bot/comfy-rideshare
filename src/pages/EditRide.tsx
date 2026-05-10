import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";
import { X } from "lucide-react";

interface RideRow {
  id: string;
  client_id: string;
  pickup_address: string;
  pickup_city: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  scheduled_at: string;
  num_escorts: number;
  notes: string | null;
  cargo_length_m: number | null;
  cargo_width_m: number | null;
  cargo_height_m: number | null;
  cargo_weight_t: number | null;
  permit_number: string | null;
  client_reference: string | null;
  drivers: { name: string; phone: string }[] | null;
  license_plates: string[] | null;
  status: string;
}

const Inner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ride, setRide] = useState<RideRow | null>(null);

  const [pickupGeo, setPickupGeo] = useState<{ city: string; lat: number; lng: number } | null>(null);
  const [dropoffGeo, setDropoffGeo] = useState<{ city: string; lat: number; lng: number } | null>(null);

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [cargoL, setCargoL] = useState("");
  const [cargoW, setCargoW] = useState("");
  const [cargoH, setCargoH] = useState("");
  const [cargoT, setCargoT] = useState("");
  const [permitNumber, setPermitNumber] = useState("");
  const [clientRef, setClientRef] = useState("");
  const [drivers, setDrivers] = useState<{ name: string; phone: string }[]>([]);
  const [plates, setPlates] = useState<string[]>([]);
  const [pickupAddr, setPickupAddr] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from("rides").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error(error?.message ?? "Rit niet gevonden"); setLoading(false); return; }
      const r = data as unknown as RideRow;
      setRide(r);
      const dt = new Date(r.scheduled_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setScheduledDate(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`);
      setScheduledTime(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`);
      setNotes(r.notes ?? "");
      setCargoL(r.cargo_length_m?.toString() ?? "");
      setCargoW(r.cargo_width_m?.toString() ?? "");
      setCargoH(r.cargo_height_m?.toString() ?? "");
      setCargoT(r.cargo_weight_t?.toString() ?? "");
      setPermitNumber(r.permit_number ?? "");
      setClientRef(r.client_reference ?? "");
      setDrivers(r.drivers ?? []);
      setPlates(r.license_plates ?? []);
      setPickupAddr(r.pickup_address);
      setDropoffAddr(r.dropoff_address);
      if (r.pickup_lat && r.pickup_lng) setPickupGeo({ city: r.pickup_city, lat: r.pickup_lat, lng: r.pickup_lng });
      if (r.dropoff_lat && r.dropoff_lng) setDropoffGeo({ city: r.dropoff_city, lat: r.dropoff_lat, lng: r.dropoff_lng });
      setLoading(false);
    })();
  }, [id]);

  const num = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = Number(s.replace(",", "."));
    return Number.isNaN(n) ? null : n;
  };

  const handleSave = async () => {
    if (!ride) return;
    if (!pickupAddr.trim() || !dropoffAddr.trim()) { toast.error("Adressen zijn verplicht."); return; }
    if (!scheduledDate || !scheduledTime) { toast.error("Datum en tijd zijn verplicht."); return; }
    const scheduledISO = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();

    setBusy(true);
    const update: any = {
      pickup_address: pickupAddr,
      dropoff_address: dropoffAddr,
      scheduled_at: scheduledISO,
      notes: notes.trim() || null,
      cargo_length_m: num(cargoL),
      cargo_width_m: num(cargoW),
      cargo_height_m: num(cargoH),
      cargo_weight_t: num(cargoT),
      permit_number: permitNumber.trim() || null,
      client_reference: clientRef.trim() || null,
      drivers: drivers.map((d) => ({ name: d.name.trim(), phone: d.phone.trim() })).filter((d) => d.name || d.phone),
      license_plates: plates.map((p) => p.trim()).filter(Boolean),
    };
    if (pickupGeo) {
      update.pickup_city = pickupGeo.city;
      update.pickup_lat = pickupGeo.lat;
      update.pickup_lng = pickupGeo.lng;
    }
    if (dropoffGeo) {
      update.dropoff_city = dropoffGeo.city;
      update.dropoff_lat = dropoffGeo.lat;
      update.dropoff_lng = dropoffGeo.lng;
    }

    const { error } = await supabase.from("rides").update(update).eq("id", ride.id);
    if (error) { setBusy(false); toast.error(error.message); return; }

    // Notify assigned escorts
    const summary: string[] = [];
    if (new Date(ride.scheduled_at).toISOString() !== scheduledISO) {
      summary.push("Nieuwe tijd: " + new Date(scheduledISO).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" }));
    }
    if (pickupAddr !== ride.pickup_address) summary.push("Vertrek aangepast.");
    if (dropoffAddr !== ride.dropoff_address) summary.push("Bestemming aangepast.");
    await supabase.rpc("notify_ride_updated", { _ride_id: ride.id, _summary: summary.join(" ") });

    setBusy(false);
    toast.success("Rit bijgewerkt.");
    navigate(`/rit/${ride.id}`);
  };

  if (loading) return <p className="text-sm text-brass-deep/50">Laden…</p>;
  if (!ride) {
    return (
      <div className="bg-card shadow-etched p-12 text-center">
        <p className="text-brass-deep/60 mb-4">Geen toegang tot deze rit.</p>
        <Link to="/dashboard" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">← Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to={`/rit/${ride.id}`} className="text-brass-deep/60 hover:text-brass-deep uppercase tracking-widest text-xs font-semibold">
          ← Terug naar ritdetails
        </Link>
        <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mt-6 mb-3">Rit bewerken</p>
        <h1 className="font-display text-3xl md:text-4xl text-brass-deep italic">
          {ride.pickup_city} <span className="text-brass-gold">→</span> {ride.dropoff_city}
        </h1>
      </header>

      <section className="bg-card shadow-etched p-6 md:p-8 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Adressen</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-brass-deep/60 block mb-1">Vertrek</label>
              <AddressAutocomplete
                value={pickupAddr}
                onChange={setPickupAddr}
                onSelect={(r: AddressResult) => { setPickupAddr(r.display); setPickupGeo({ city: r.city, lat: r.lat, lng: r.lng }); }}
              />
            </div>
            <div>
              <label className="text-xs text-brass-deep/60 block mb-1">Bestemming</label>
              <AddressAutocomplete
                value={dropoffAddr}
                onChange={setDropoffAddr}
                onSelect={(r: AddressResult) => { setDropoffAddr(r.display); setDropoffGeo({ city: r.city, lat: r.lat, lng: r.lng }); }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Tijd</p>
          <div className="grid grid-cols-2 gap-4">
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold" />
            <input type="time" step={900} value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold" />
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">Lading</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input placeholder="Lengte (m)" value={cargoL} onChange={(e) => setCargoL(e.target.value)} className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
            <input placeholder="Breedte (m)" value={cargoW} onChange={(e) => setCargoW(e.target.value)} className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
            <input placeholder="Hoogte (m)" value={cargoH} onChange={(e) => setCargoH(e.target.value)} className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
            <input placeholder="Gewicht (t)" value={cargoT} onChange={(e) => setCargoT(e.target.value)} className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-brass-gold font-bold block mb-2">Vergunningnummer</label>
            <input value={permitNumber} onChange={(e) => setPermitNumber(e.target.value)}
              className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-brass-gold font-bold block mb-2">Eigen referentie</label>
            <input value={clientRef} onChange={(e) => setClientRef(e.target.value)}
              className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-widest text-brass-gold font-bold block mb-2">Opmerkingen</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            className="w-full bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Chauffeurs</p>
            <button type="button" onClick={() => setDrivers((d) => [...d, { name: "", phone: "" }])}
              className="text-[10px] uppercase tracking-widest text-brass-deep font-semibold hover:text-brass-gold">+ Toevoegen</button>
          </div>
          {drivers.length === 0 && <p className="text-xs text-brass-deep/40 italic">Geen chauffeurs.</p>}
          <ul className="space-y-2">
            {drivers.map((d, i) => (
              <li key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <input placeholder="Naam" value={d.name} onChange={(e) => setDrivers((arr) => arr.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                <input placeholder="Telefoon" value={d.phone} onChange={(e) => setDrivers((arr) => arr.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                  className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm" />
                <button type="button" onClick={() => setDrivers((arr) => arr.filter((_, j) => j !== i))}
                  className="px-2 text-brass-deep/50 hover:text-red-700"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Kentekens</p>
            <button type="button" onClick={() => setPlates((p) => [...p, ""])}
              className="text-[10px] uppercase tracking-widest text-brass-deep font-semibold hover:text-brass-gold">+ Toevoegen</button>
          </div>
          {plates.length === 0 && <p className="text-xs text-brass-deep/40 italic">Geen kentekens.</p>}
          <ul className="space-y-2">
            {plates.map((p, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-2">
                <input value={p} onChange={(e) => setPlates((arr) => arr.map((x, j) => j === i ? e.target.value.toUpperCase() : x))}
                  className="bg-parchment border border-brass-deep/15 px-3 py-2 text-sm font-mono tracking-wider" />
                <button type="button" onClick={() => setPlates((arr) => arr.filter((_, j) => j !== i))}
                  className="px-2 text-brass-deep/50 hover:text-red-700"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3 pt-4 border-t border-brass-deep/10">
          <button type="button" disabled={busy} onClick={handleSave}
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50">
            {busy ? "Opslaan…" : "Wijzigingen opslaan"}
          </button>
          <Link to={`/rit/${ride.id}`}
            className="px-6 py-3 border border-brass-deep/30 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5">
            Annuleren
          </Link>
        </div>

        <p className="text-xs text-brass-deep/55">
          Toegewezen begeleiders krijgen automatisch een melding van de wijziging.
        </p>
      </section>
    </div>
  );
};

const EditRide = () => (
  <RequireAuth>
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-12 md:py-16 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-4xl mx-auto">
          <Inner />
        </div>
      </main>
      <Footer />
    </div>
  </RequireAuth>
);

export default EditRide;
