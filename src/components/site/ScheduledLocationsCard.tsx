import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CalendarClock, Loader2, Trash2, Plus } from "lucide-react";
import { AddressAutocomplete, type AddressResult } from "@/components/site/AddressAutocomplete";

// Begeleider plant vooraf "ik ben op die datum/tijd op deze locatie".
// Voor elke ritaanvraag waarvan de starttijd binnen dit venster valt, wordt de
// aanvoertijd berekend vanaf deze geplande locatie i.p.v. de thuisbasis.
// Retour gaat altijd terug naar de thuisbasis.

type ScheduledLocation = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  start_at: string;
  end_at: string;
  note: string | null;
};

const isoLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function ScheduledLocationsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ScheduledLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [addr, setAddr] = useState<AddressResult | null>(null);
  const [addrText, setAddrText] = useState("");
  const [startAt, setStartAt] = useState(isoLocal(new Date(Date.now() + 24 * 3600_000)));
  const [endAt, setEndAt] = useState(isoLocal(new Date(Date.now() + 32 * 3600_000)));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("escort_scheduled_locations")
        .select("id, address, lat, lng, start_at, end_at, note")
        .eq("escort_id", user.id)
        .gte("end_at", new Date().toISOString())
        .order("start_at", { ascending: true });
      if (!error) setRows((data ?? []) as ScheduledLocation[]);
      setLoading(false);
    })();
  }, [user]);

  const resetForm = () => {
    setAddr(null); setAddrText(""); setNote("");
    setStartAt(isoLocal(new Date(Date.now() + 24 * 3600_000)));
    setEndAt(isoLocal(new Date(Date.now() + 32 * 3600_000)));
  };

  const add = async () => {
    if (!user) return;
    if (!addr) return toast.error("Kies een adres.");
    const s = new Date(startAt).getTime();
    const e = new Date(endAt).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e)) return toast.error("Vul start- en eindtijd in.");
    if (e <= s) return toast.error("Eindtijd moet na starttijd liggen.");
    setBusy(true);
    const { data, error } = await supabase
      .from("escort_scheduled_locations")
      .insert({
        escort_id: user.id,
        address: addr.address || addr.display,
        lat: addr.lat,
        lng: addr.lng,
        start_at: new Date(s).toISOString(),
        end_at: new Date(e).toISOString(),
        note: note.trim() || null,
      })
      .select("id, address, lat, lng, start_at, end_at, note")
      .single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setRows((r) => [...r, data as ScheduledLocation].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    setShowForm(false);
    resetForm();
    toast.success("Geplande standplaats opgeslagen. Aanvoer wordt in dit venster vanaf deze locatie berekend.");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("escort_scheduled_locations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  if (loading) return null;

  const fmt = (s: string) => new Date(s).toLocaleString("nl-NL", {
    weekday: "short", day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bg-card shadow-etched p-6 border border-brass-deep/10">
      <div className="flex items-start gap-3 mb-4">
        <CalendarClock className="w-5 h-5 text-brass-gold mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-display text-lg text-brass-deep">Geplande standplaats</h3>
          <p className="text-xs text-brass-deep/60 mt-1">
            Geef vooraf aan dat je op een bepaalde datum en tijd op een specifieke
            locatie bent. Voor ritaanvragen waarvan de starttijd binnen dit venster
            valt, wordt de <strong>aanvoertijd vanaf deze geplande locatie</strong> berekend
            in plaats van vanaf je thuisbasis. Retour gaat altijd terug naar je thuisbasis.
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2 mb-4">
          {rows.map((r) => (
            <li key={r.id} className="bg-brass-gold/5 border border-brass-gold/20 px-3 py-2 text-sm flex items-start justify-between gap-3">
              <div>
                <p className="text-brass-deep font-semibold">📍 {r.address}</p>
                <p className="text-xs text-brass-deep/70 mt-0.5">
                  {fmt(r.start_at)} — {fmt(r.end_at)}
                </p>
                {r.note && <p className="text-xs text-brass-deep/60 mt-0.5 italic">{r.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                className="text-brass-deep/50 hover:text-brass-deep p-1"
                title="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Locatie toevoegen
        </button>
      ) : (
        <div className="space-y-3 border-t border-brass-deep/10 pt-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold block mb-1">Locatie</label>
            <AddressAutocomplete
              label=""
              value={addrText}
              onChange={(v) => setAddrText(v)}
              onSelect={(r) => { setAddr(r); setAddrText(r.display); }}
              placeholder="Zoek adres of plaats…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-brass-deep/70 block">
              <span className="block mb-1 uppercase tracking-widest text-[10px] font-bold text-brass-deep/60">Van</span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full border border-brass-deep/20 bg-parchment px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-brass-deep/70 block">
              <span className="block mb-1 uppercase tracking-widest text-[10px] font-bold text-brass-deep/60">Tot</span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full border border-brass-deep/20 bg-parchment px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="text-xs text-brass-deep/70 block">
            <span className="block mb-1 uppercase tracking-widest text-[10px] font-bold text-brass-deep/60">Notitie (optioneel)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bijv. klus in Antwerpen"
              className="w-full border border-brass-deep/20 bg-parchment px-2 py-1.5 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="px-4 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              disabled={busy}
              className="px-4 py-2 text-brass-deep/70 uppercase tracking-widest text-xs font-semibold hover:text-brass-deep disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
