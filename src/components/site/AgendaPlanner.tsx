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
const SLOT_START_H = 0; // 00:00 — volledige 24-uurs agenda
const SLOT_END_H = 24; // 24:00
const SLOTS_PER_DAY = (SLOT_END_H - SLOT_START_H) * 2;

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hhmm = (mins: number) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

const slotIndex = (d: Date) => {
  const h = d.getHours();
  const m = d.getMinutes();
  return (h - SLOT_START_H) * 2 + Math.floor(m / 30);
};

interface Props {
  escortId: string;
  rides: Ride[];
}

interface Anchor {
  date: string;
  idx: number;
  mode: "add" | "remove";
}

export const AgendaPlanner = ({ escortId, rides }: Props) => {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [googleBusy, setGoogleBusy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [hoverIdx, setHoverIdx] = useState<{ date: string; idx: number } | null>(null);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: DAYS_AHEAD }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const rideSlots = useMemo(() => {
    const m = new Map<string, Ride>();
    rides.forEach((r) => {
      const start = new Date(r.scheduled_at);
      const dKey = ymd(start);
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
      (data ?? []).forEach((r: { date: string | null; start_time: string }) => {
        if (!r.date) return;
        const [h, m] = r.start_time.split(":").map(Number);
        const idx = (h - SLOT_START_H) * 2 + Math.floor(m / 30);
        if (idx >= 0 && idx < SLOTS_PER_DAY) set.add(`${r.date}|${idx}`);
      });
      setBlocked(set);
      setLoading(false);

      // Google Agenda busy overlay (best-effort)
      try {
        const { data: gData } = await supabase.functions.invoke("google-calendar-sync");
        if (gData && (gData as any).connected && Array.isArray((gData as any).busy)) {
          const gset = new Set<string>();
          for (const b of (gData as any).busy as { start: string; end: string }[]) {
            const s = new Date(b.start);
            const e = new Date(b.end);
            // Walk per 30-minute slot
            const cursor = new Date(s);
            cursor.setMinutes(Math.floor(cursor.getMinutes() / 30) * 30, 0, 0);
            while (cursor < e) {
              const dKey = ymd(cursor);
              const idx = slotIndex(cursor);
              if (idx >= 0 && idx < SLOTS_PER_DAY) gset.add(`${dKey}|${idx}`);
              cursor.setMinutes(cursor.getMinutes() + 30);
            }
          }
          setGoogleBusy(gset);
        }
      } catch (_) {
        // niet gekoppeld of fout — overlay blijft leeg
      }
    })();
  }, [escortId, days]);

  const applyRange = (date: string, fromIdx: number, toIdx: number, mode: "add" | "remove") => {
    const lo = Math.min(fromIdx, toIdx);
    const hi = Math.max(fromIdx, toIdx);
    setBlocked((s) => {
      const next = new Set(s);
      for (let i = lo; i <= hi; i++) {
        const key = `${date}|${i}`;
        if (rideSlots.has(key)) continue;
        if (mode === "add") next.add(key);
        else next.delete(key);
      }
      return next;
    });
    setDirty(true);
  };

  const handleSlotClick = (date: string, idx: number) => {
    const key = `${date}|${idx}`;
    if (rideSlots.has(key)) return;

    if (!anchor) {
      // Eerste klik — markeer alvast dit slot en zet anker
      const mode: "add" | "remove" = blocked.has(key) ? "remove" : "add";
      applyRange(date, idx, idx, mode);
      setAnchor({ date, idx, mode });
      return;
    }

    if (anchor.date !== date) {
      // Andere dag — start nieuw anker
      const mode: "add" | "remove" = blocked.has(key) ? "remove" : "add";
      applyRange(date, idx, idx, mode);
      setAnchor({ date, idx, mode });
      return;
    }

    // Tweede klik op zelfde dag — vul bereik door
    applyRange(date, anchor.idx, idx, anchor.mode);
    setAnchor(null);
    setHoverIdx(null);
  };

  // Esc om anker te annuleren
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAnchor(null);
        setHoverIdx(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
          end_time: hhmm(endMin === 1440 ? 1440 - 1 : endMin),
        };
      });
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

  return (
    <div className="bg-card shadow-etched p-6">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Agenda</p>
          <h2 className="font-display text-2xl text-brass-deep italic">7 dagen · 24u · per half uur</h2>
          <p className="text-[11px] text-brass-deep/60 mt-1">
            Klik het <strong>eerste half uur</strong> en daarna het <strong>laatste half uur</strong> — alles ertussen wordt automatisch doorgetrokken. Druk op <kbd className="px-1 bg-parchment border border-brass-deep/20">Esc</kbd> om te annuleren.
          </p>
          {anchor && (
            <p className="text-[11px] text-brass-gold mt-1 font-semibold">
              ↪ Begin gezet op {hhmm(SLOT_START_H * 60 + anchor.idx * 30)} ({new Date(anchor.date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" })}). Klik einduur…
            </p>
          )}
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
        <div className="min-w-[1200px]">
          {/* Hour header */}
          <div
            className="grid text-[9px] text-brass-deep/50 mb-1 tabular-nums"
            style={{ gridTemplateColumns: `64px repeat(${SLOTS_PER_DAY}, 1fr)` }}
          >
            <div />
            {Array.from({ length: SLOTS_PER_DAY }).map((_, i) => (
              <div key={i} className="text-center">
                {i % 2 === 0 ? String(SLOT_START_H + i / 2).padStart(2, "0") : ""}
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
                  const isAnchor = anchor && anchor.date === dKey && anchor.idx === i;
                  const inPreview =
                    anchor &&
                    anchor.date === dKey &&
                    hoverIdx &&
                    hoverIdx.date === dKey &&
                    i >= Math.min(anchor.idx, hoverIdx.idx) &&
                    i <= Math.max(anchor.idx, hoverIdx.idx);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSlotClick(dKey, i)}
                      onMouseEnter={() => anchor && setHoverIdx({ date: dKey, idx: i })}
                      className={`h-6 transition-colors ${
                        ride
                          ? "bg-brass-gold/40 cursor-default"
                          : isBlocked
                          ? "bg-brass-deep hover:bg-brass-deep/90"
                          : inPreview
                          ? anchor?.mode === "add"
                            ? "bg-brass-deep/40"
                            : "bg-brass-gold/30"
                          : "bg-parchment hover:bg-brass-gold/20"
                      } ${hourBoundary ? "border-l border-brass-deep/15" : ""} ${
                        isAnchor ? "ring-2 ring-brass-gold ring-inset z-10" : ""
                      }`}
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
