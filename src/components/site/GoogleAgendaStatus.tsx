import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BusyWindow { start: string; end: string }
interface SyncResult { connected: boolean; busy?: BusyWindow[] }

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const localeMap: Record<string, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

export const GoogleAgendaStatus = () => {
  const { t, i18n } = useTranslation();
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

  if (loading) return <p className="text-sm text-brass-deep/80">{t("google.checking")}</p>;

  if (!data?.connected) {
    return (
      <div className="bg-brass-gold/10 border-2 border-brass-gold p-6 shadow-etched">
        <div className="flex items-start gap-4">
          <AlertTriangle className="size-6 text-brass-gold shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-display text-2xl text-brass-deep italic">{t("google.connectTitle")}</h3>
            <p className="text-sm text-brass-deep/70 mt-1">{t("google.connectBody")}</p>
            <p className="text-xs text-brass-deep font-semibold mt-2">
              ⚠ Let op: zorg dat je browser pop-ups van deze site toestaat.
            </p>
            <Link
              to="/profiel"
              className="inline-block mt-4 px-5 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors"
            >
              {t("google.connectCta")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  const locale = localeMap[i18n.resolvedLanguage ?? "nl"] ?? "nl-NL";

  return (
    <div className="bg-card shadow-etched p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-brass-gold mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold">{t("google.connected")}</p>
            <h3 className="font-display text-xl text-brass-deep italic">{t("google.avail7days")}</h3>
            <p className="text-[11px] text-brass-deep/80 mt-1">{t("google.availHint")}</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={syncing}
          className="px-4 py-2 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-40 inline-flex items-center gap-2"
        >
          <RefreshCw className={`size-3 ${syncing ? "animate-spin" : ""}`} /> {t("google.refresh")}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const k = ymd(d);
          const min = busyByDay.get(k) ?? 0;
          const heavy = min >= 240;
          const some = min > 0;
          const label = d.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
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
                {min === 0 ? t("google.free") : t("google.busyHours", { h: Math.round(min / 60 * 10) / 10 })}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-brass-deep/80">
        <Calendar className="size-3" />
        {t("google.tip")}
      </div>
    </div>
  );
};
