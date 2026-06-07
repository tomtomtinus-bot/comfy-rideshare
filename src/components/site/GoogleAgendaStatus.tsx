import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  if (loading) return null;

  if (!data?.connected) {
    return (
      <Card className="p-4 border-input">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("google.connectTitle")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("google.connectBody")}</p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/profiel">{t("google.connectCta")}</Link>
          </Button>
        </div>
      </Card>
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
    <Card className="p-4 border-input">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="size-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-foreground truncate">
            <span className="font-medium">Google Agenda gekoppeld</span>
            <span className="text-muted-foreground"> — Beschikbaarheid komende 7 dagen</span>
          </p>
        </div>
        <Button
          onClick={load}
          disabled={syncing}
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          {t("google.refresh")}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {days.map((d) => {
          const k = ymd(d);
          const min = busyByDay.get(k) ?? 0;
          const heavy = min >= 240;
          const some = min > 0 && !heavy;
          const dayLabel = d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
          const dayNum = d.getDate();
          const title = min === 0
            ? `${dayLabel} ${dayNum} — ${t("google.free")}`
            : `${dayLabel} ${dayNum} — ${t("google.busyHours", { h: Math.round(min / 60 * 10) / 10 })}`;
          return (
            <div
              key={k}
              title={title}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {dayLabel} {dayNum}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  heavy
                    ? "bg-muted-foreground/40"
                    : some
                    ? "bg-amber-500/70"
                    : "bg-emerald-500/80"
                }`}
              />
            </div>
          );
        })}
      </div>
    </Card>
  );
};
