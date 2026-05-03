import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Ride {
  id: string;
  scheduled_at: string;
  pickup_city: string;
  dropoff_city: string;
}

const DAYS_AHEAD = 7;
const SLOT_START_H = 6; // 06:00
const SLOT_END_H = 22; // 22:00 (exclusive)
const SLOTS_PER_DAY = (SLOT_END_H - SLOT_START_H) * 2;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const slotIndex = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - SLOT_START_H) * 2 + Math.floor(m / 30);
};

interface Props {
  escortId: string;
  rides: Ride[];
}

export const AgendaPlanner = ({ escortId, rides }: Props) => {
  // key: `${dateKey}|${slotIdx}` -> blocked
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [dragMode, setDragMode] = useState<"add" | "remove" | null>(null);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  // Map ride slots: dateKey|slotIdx -> ride
  const rideSlots = useMemo(() => {
    const m = new Map<string, Ride>();
    rides.forEach((r) => {
      const start = new Date(r.scheduled_at);
      const dKey = ymd(start);
      // Block ~3h (6 slots) for the ride visualization
      const startIdx = Math.max(0, slotIndex(start));
      for (let i = 0; i < 6; i++) {
        const idx = startIdx + i;
        if (idx >= 0 && idx < SLOTS_PER_DAY) m.set(`${dKey}|${idx}`, r);
      }
    });
    return m;
  }, [rides]);

  useEffect(() => {
    (async () => {
      const startDate = ymd(days[0]);
      const endDate = ymd(days[days.length - 1]);
      const { data } = await supabase
        .from("escort_availability")
        .select("date, start_time")
        .eq("escort_id", escortId)
        .gte("date", startDate)
        .lte("date", endDate);
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (!r.date) return;
        const [h, m] = (r.start_time as string).split(":").map(Number);
        const idx = (h - SLOT_START_H) * 2 + Math.floor(m / 30);
        if (idx >= 0 && idx < SLOTS_PER_DAY) set.add(`${r.date}|${idx}`);
      });
      setBlocked(set);
      setLoading(false);
    })();
  }, [escortId, days]);

  const toggleSlot = (key: string, mode: "add" | "remove") => {
    if (rideSlots.has(key)) return;
    setBlocked((s) => {
      const next = new Set(s);
      if (mode === "add") next.add(key);
      else next.delete(key);
      return next;
    });
    setDirty(true);
  };

  const onMouseDown = (key: string) => {
    if (rideSlots.has(key)) return;
    const mode = blocked.has(key) ? "remove" : "add";
    setDragMode(mode);
    toggleSlot(key, mode);
  };
  const onMouseEnter = (key: string) => {
    if (!dragMode) return;
    toggleSlot(key, dragMode);
  };

  useEffect(() => {
    const up = () => setDragMode(null);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const save = async () => {
    setSaving(true);
    const startDate = ymd(days[0]);
    const endDate = ymd(days[days.length - 1]);
    await supabase
      .from("escort_availability")
      .delete()
      .eq("escort_id", escortId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (blocked.size > 0) {
      const rows = Array.from(blocked).map((key) => {
        const [date, idxStr] = key.split("|");
        const idx = Number(idxStr);
        const startMin = SLOT_START_H * 60 + idx * 30;
        const endMin = startMin + 30;
        return {
          escort_id: escortId,
          date,
          weekday: new Date(date).getDay(),
          start_time: hhmm(startMin),
          end_time: hhmm(endMin),
        };
      });
      // Chunk to avoid huge payloads
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { error } = await supabase.from("escort_availability").insert(chunk);
        if (error) {
          setSaving(false);
          return toast.error(error.message);
        }
      }
    }
    setSaving(false);
    setDirty(false);
    toast.success("Agenda opgeslagen");
  };

  if (loading) return <p className="text-sm text-brass-deep/50">Agenda laden…</p>;

  // Hour labels (every 2 slots)
  const hourCols: { label: string; col: number }[] = [];
  for (let h = SLOT_START_H; h < SLOT_END_H; h++) {
    hourCols.push({ label: `${String(h).padStart(2, "0")}`, col: (h - SLOT_START_H) * 2 });
  }

  return (
    <div className="bg-card shadow-etched p-6">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Agenda</p>
          <h2 className="font-display text-2xl text-brass-deep italic">7 dagen · per half uur</h2>
          <p className="text-[11px] text-brass-deep/60 mt-1">
            Klik of sleep om je <strong>niet-beschikbaar</strong> te markeren. Geplande ritten zijn vast.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="px-5 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-40"
        >
          {saving ? "Opslaan…" : dirty ? "Agenda opslaan" : "Opgeslagen"}
        </button>
      </div>

      <div className="overflow-x-auto select-none">
        <div className="min-w-[720px]">
          {/* Hour header */}
          <div
            className="grid text-[9px] text-brass-deep/50 mb-1 tabular-nums"
            style={{ gridTemplateColumns: `64px repeat(${SLOTS_PER_DAY}, 1fr)` }}
          >
            <div />
            {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => (
              <div key={i} className="text-center">
                {i % 2 === 0 ? hourCols.find((h) => h.col === i)?.label : ""}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const dKey = ymd(d);
            return (
              <div
                key={dKey}
                className="grid items-center mb-0.5"
                style={{ gridTemplateColumns: `64px repeat(${SLOTS_PER_DAY}, 1fr)` }}
              >
                <div className="text-[10px] uppercase tracking-widest text-brass-deep/70 font-bold pr-2 text-right">
                  {d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" })}
                </div>
                {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => {
                  const key = `${dKey}|${i}`;
                  const ride = rideSlots.get(key);
                  const isBlocked = blocked.has(key);
                  const hourBoundary = i % 2 === 0;
                  return (
                    <button
                      key={key}
                      type="button"
                      onMouseDown={() => onMouseDown(key)}
                      onMouseEnter={() => onMouseEnter(key)}
                      onClick={(e) => e.preventDefault()}
                      className={`h-6 transition-colors ${
                        ride
                          ? "bg-brass-gold/40 cursor-default"
                          : isBlocked
                          ? "bg-brass-deep hover:bg-brass-deep/90"
                          : "bg-parchment hover:bg-brass-gold/20"
                      } ${hourBoundary ? "border-l border-brass-deep/15" : ""}`}
                      title={
                        ride
                          ? `Rit ${ride.pickup_city} → ${ride.dropoff_city}`
                          : `${d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" })} · ${hhmm(SLOT_START_H * 60 + i * 30)}`
                      }
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-brass-deep/60">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-parchment border border-brass-deep/15" /> Beschikbaar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-brass-deep" /> Niet beschikbaar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-brass-gold/40" /> Rit gepland
        </span>
      </div>
    </div>
  );
};
