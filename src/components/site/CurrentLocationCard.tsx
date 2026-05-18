import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

// Begeleider geeft hier aan "ik sta nu hier zoekend naar werk in de buurt".
// De aanvoertijd voor nieuwe ritaanvragen wordt vanaf deze plek berekend
// (in plaats van vanaf de thuisbasis). De afvoertijd blijft altijd terug
// naar de thuisbasis.
const DURATIONS = [
  { hours: 2, label: "2 uur" },
  { hours: 4, label: "4 uur" },
  { hours: 8, label: "8 uur" },
  { hours: 12, label: "12 uur" },
];

type CurrentLocation = {
  current_lat: number | null;
  current_lng: number | null;
  current_address: string | null;
  current_until: string | null;
};

export default function CurrentLocationCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState<CurrentLocation | null>(null);
  const [hours, setHours] = useState(8);
  const [, force] = useState(0);

  const isActive = loc?.current_until && new Date(loc.current_until).getTime() > Date.now();

  // Hertekenen elke 60s zodat "verloopt om" en de tijd nauwkeurig blijft.
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("escort_profiles")
        .select("current_lat, current_lng, current_address, current_until")
        .eq("id", user.id)
        .maybeSingle();
      setLoc((data ?? null) as CurrentLocation | null);
      setLoading(false);
    })();
  }, [user]);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const { data } = await supabase.functions.invoke("google-geocode", {
        body: { lat, lng },
      });
      return (data?.formatted_address as string) ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const setHere = () => {
    if (!user) return;
    if (!("geolocation" in navigator)) {
      return toast.error("Je apparaat ondersteunt geen locatiebepaling.");
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        const until = new Date(Date.now() + hours * 3600_000).toISOString();
        const { error } = await supabase
          .from("escort_profiles")
          .update({
            current_lat: lat,
            current_lng: lng,
            current_address: address,
            current_until: until,
          })
          .eq("id", user.id);
        setBusy(false);
        if (error) return toast.error(error.message);
        setLoc({ current_lat: lat, current_lng: lng, current_address: address, current_until: until });
        toast.success(`Locatie ingesteld voor ${hours} uur.`);
      },
      (err) => {
        setBusy(false);
        toast.error(err.code === err.PERMISSION_DENIED
          ? "Locatietoegang geweigerd. Sta locatie toe in je browser/telefoon."
          : "Kon je locatie niet bepalen.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  const clearHere = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("escort_profiles")
      .update({ current_lat: null, current_lng: null, current_address: null, current_until: null })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    setLoc(null);
    toast.success("Tijdelijke locatie gewist. Aanvoer wordt weer vanaf je thuisbasis berekend.");
  };

  if (loading) return null;

  return (
    <div className="bg-card shadow-etched p-6 border border-brass-deep/10">
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="w-5 h-5 text-brass-gold mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-display text-lg text-brass-deep">Tijdelijke standplaats</h3>
          <p className="text-xs text-brass-deep/60 mt-1">
            Geef aan waar je nu bent om ritten in de buurt op te pikken. Aanvoertijd wordt
            vanaf je huidige locatie berekend (retour blijft naar je thuisbasis).
          </p>
        </div>
      </div>

      {isActive ? (
        <div className="space-y-3">
          <div className="bg-brass-gold/10 border border-brass-gold/30 px-3 py-2 text-sm">
            <p className="text-brass-deep font-semibold">📍 {loc?.current_address ?? "Huidige locatie"}</p>
            <p className="text-xs text-brass-deep/70 mt-1">
              Actief tot{" "}
              {new Date(loc!.current_until!).toLocaleString("nl-NL", {
                weekday: "short", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={setHere}
              disabled={busy}
              className="px-4 py-2 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Locatie vernieuwen"}
            </button>
            <button
              type="button"
              onClick={clearHere}
              disabled={busy}
              className="px-4 py-2 text-brass-deep/70 uppercase tracking-widest text-xs font-semibold hover:text-brass-deep disabled:opacity-50"
            >
              Wissen
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-brass-deep/70 flex items-center gap-2">
            Geldig voor:
            <select
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="border border-brass-deep/20 bg-parchment px-2 py-1.5 text-sm"
            >
              {DURATIONS.map((d) => (
                <option key={d.hours} value={d.hours}>{d.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={setHere}
            disabled={busy}
            className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
            Ik sta nu hier
          </button>
        </div>
      )}
    </div>
  );
}
