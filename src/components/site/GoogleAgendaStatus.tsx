import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BusyWindow { start: string; end: string }
interface SyncResult { connected: boolean; busy?: BusyWindow[] }

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const GoogleAgendaStatus = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<SyncResult | null>(null);

  const load = async () => {
    setSyncing(true);
    try {
      const { data: res } = await supabase.functions.invoke("google-calendar-sync");
      setData(res as SyncResult);
    } catch (_) {
      setData({ connected: false });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-sm text-brass-deep/50">Agenda controleren…</p>;

  if (!data?.connected) {
    return (
      <div className="bg-brass-gold/10 border-2 border-brass-gold p-6 shadow-etched">
        <div className="flex items-start gap-4">
          <AlertTriangle className="size-6 text-brass-gold shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-display text-2xl text-brass-deep italic">Koppel je Google Agenda</h3>
            <p className="text-sm text-brass-deep/70 mt-1">
              Je krijgt pas rit-uitnodigingen als je Google Agenda gekoppeld is. De planner controleert
              of je vrij bent op het ritmoment (incl. reistijd heen en terug). Geaccepteerde ritten worden
              automatisch in je agenda geplaatst.
            </p>
            <Link
              to="/escort-instellingen"
              className="inline-block mt-4 px-5 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors"
            >
              Google Agenda koppelen
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Connected — overzicht 7 dagen
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i); return d;
  });
  const busyByDay = new Map<string, number>();
  for (const b of data.busy ?? []) {
    const s = new Date(b.start);
    const e = new Date(b.end);
    const cur = new Date(s);
    while (cur < e) {
      const k = ymd(cur);
      busyByDay.set(k, (busyByDay.get(k) ?? 0) + 30);
      cur.setMinutes(cur.getMinutes() + 30);
    }
  }

  return (
    <div className="bg-card shadow-etched p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-brass-gold mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">Google Agenda gekoppeld</p>
            <h3 className="font-display text-xl text-brass-deep italic">Beschikbaarheid komende 7 dagen</h3>
            <p className="text-[11px] text-brass-deep/60 mt-1">
              Plaats verlof, persoonlijke afspraken en blokkades direct in je Google Agenda.
              Wij gebruiken die als bron — je krijgt geen uitnodiging als je bezet bent.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={syncing}
          className="px-4 py-2 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-40 inline-flex items-center gap-2"
        >
          <RefreshCw className={`size-3 ${syncing ? "animate-spin" : ""}`} /> Vernieuwen
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = ymd(d);
          const min = busyByDay.get(k) ?? 0;
          const heavy = min >= 240;   // >= 4u bezet
          const some = min > 0;
          const label = d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric" });
          return (
            <div key={k} className={`p-2 text-center border ${
              heavy
                ? "bg-brass-deep text-parchment border-brass-deep"
                : some
                ? "bg-brass-gold/30 border-brass-gold/60 text-brass-deep"
                : "bg-parchment border-brass-deep/15 text-brass-deep/70"
            }`}>
              <p className="text-[10px] uppercase tracking-widest font-bold">{label}</p>
              <p className="text-[10px] mt-1 tabular-nums">
                {min === 0 ? "vrij" : `${Math.round(min / 60 * 10) / 10}u bezet`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-brass-deep/60">
        <Calendar className="size-3" />
        Tip: gebruik een terugkerende afspraak voor vaste vrije dagen.
      </div>
    </div>
  );
};
