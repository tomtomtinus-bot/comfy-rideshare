import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, RefreshCw, Calendar, Ban, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface BusyWindow { start: string; end: string }
interface Assignment {
  id: string;
  ride_id: string;
  scheduled_at: string;
  hours: number;
  pickup_city: string;
  dropoff_city: string;
}
interface SyncResult {
  connected: boolean;
  busy?: BusyWindow[];
  assignments?: Assignment[];
  account_email?: string | null;
  last_sync_at?: string | null;
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const localeMap: Record<string, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

const fmtRel = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "zojuist";
  if (diff < 3600) return `${Math.round(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.round(diff / 3600)} u geleden`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "2-digit", month: "short" });
};

const fmtTime = (iso: string, locale: string) =>
  new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

export const GoogleAgendaStatus = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<SyncResult | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockDate, setBlockDate] = useState<string>("");
  const [blockTitle, setBlockTitle] = useState<string>("[ViaCust] Bezet/Verlof");
  const [blockSlots, setBlockSlots] = useState<string[]>([]);
  const [blocking, setBlocking] = useState(false);

  const SLOTS: { id: string; label: string; time: string }[] = [
    { id: "night",     label: "Nacht",   time: "00:00 – 06:00" },
    { id: "morning",   label: "Ochtend", time: "06:00 – 12:00" },
    { id: "afternoon", label: "Middag",  time: "12:00 – 18:00" },
    { id: "evening",   label: "Avond",   time: "18:00 – 23:59" },
  ];

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

  const locale = localeMap[i18n.resolvedLanguage ?? "nl"] ?? "nl-NL";

  const { days, busyByDay, intervalsByDay, ridesByDay } = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); return d;
    });
    const busyByDay = new Map<string, number>();
    const intervalsByDay = new Map<string, { start: Date; end: Date }[]>();
    for (const b of data?.busy ?? []) {
      const s = new Date(b.start);
      const e = new Date(b.end);
      // attribute to the start day for display intervals
      const k = ymd(s);
      const arr = intervalsByDay.get(k) ?? [];
      arr.push({ start: s, end: e });
      intervalsByDay.set(k, arr);
      const cur = new Date(s);
      while (cur < e) {
        const dk = ymd(cur);
        busyByDay.set(dk, (busyByDay.get(dk) ?? 0) + 30);
        cur.setMinutes(cur.getMinutes() + 30);
      }
    }
    const ridesByDay = new Map<string, Assignment[]>();
    for (const a of data?.assignments ?? []) {
      const k = ymd(new Date(a.scheduled_at));
      const arr = ridesByDay.get(k) ?? [];
      arr.push(a);
      ridesByDay.set(k, arr);
    }
    return { days, busyByDay, intervalsByDay, ridesByDay };
  }, [data]);

  const openBlockDialog = (k: string) => {
    setBlockDate(k);
    setBlockTitle("[ViaCust] Bezet/Verlof");
    setBlockOpen(true);
  };

  const submitBlock = async () => {
    if (!blockDate) return;
    setBlocking(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("google-calendar-block-day", {
        body: { date: blockDate, title: blockTitle || "[ViaCust] Bezet/Verlof" },
      });
      if (error || (res as any)?.error) throw new Error((res as any)?.error ?? error?.message);
      toast.success("Dag geblokkeerd in Google Agenda");
      setBlockOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Blokkeren mislukt");
    } finally {
      setBlocking(false);
    }
  };

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

  return (
    <>
      <Card className="p-4 border-input">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="size-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">Google Agenda gekoppeld</span>
              <span className="text-muted-foreground"> — Beschikbaarheid komende 7 dagen</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
              <span className="truncate max-w-[220px]">
                {data.account_email ? `Gekoppeld met ${data.account_email}` : "Gekoppeld"}
                {" — "}Laatste sync: {fmtRel(data.last_sync_at)}
              </span>
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
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {days.map((d) => {
            const k = ymd(d);
            const min = busyByDay.get(k) ?? 0;
            const heavy = min >= 240;
            const some = min > 0 && !heavy;
            const dayLabel = d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
            const dayNum = d.getDate();
            const intervals = intervalsByDay.get(k) ?? [];
            const rides = ridesByDay.get(k) ?? [];

            return (
              <Popover key={k}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex-1 flex flex-col items-center gap-1 rounded-md py-1 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
                    aria-label={`${dayLabel} ${dayNum}`}
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
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="center">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {min === 0
                        ? "Vrij"
                        : `${Math.round(min / 60 * 10) / 10} u bezet`}
                    </p>
                  </div>

                  <div className="px-3 py-2 max-h-56 overflow-auto">
                    {min === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Geen afspraken in Google Agenda.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {intervals.map((iv, idx) => {
                          const ride = rides.find((r) => {
                            const rt = new Date(r.scheduled_at).getTime();
                            return rt >= iv.start.getTime() - 60_000 && rt <= iv.end.getTime();
                          });
                          return (
                            <li key={idx} className="text-xs">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-foreground tabular-nums">
                                  {fmtTime(iv.start.toISOString(), locale)} – {fmtTime(iv.end.toISOString(), locale)}
                                </span>
                                {ride && (
                                  <Link
                                    to={`/opdracht/${ride.ride_id}`}
                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                  >
                                    Rit <ExternalLink className="size-3" />
                                  </Link>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                {ride
                                  ? `${ride.pickup_city} → ${ride.dropoff_city}`
                                  : "Externe afspraak"}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  {min === 0 && (
                    <div className="px-3 py-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 gap-1.5 text-xs"
                        onClick={() => openBlockDialog(k)}
                      >
                        <Ban className="size-3.5" />
                        Dag blokkeren
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>

        <div className="sm:hidden mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          <span className="truncate">
            {data.account_email ? data.account_email : "Gekoppeld"}
            {" — "}Laatste sync: {fmtRel(data.last_sync_at)}
          </span>
        </div>
      </Card>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dag blokkeren</DialogTitle>
            <DialogDescription>
              {blockDate &&
                `Plaats een blokkade in je Google Agenda op ${new Date(blockDate).toLocaleDateString(
                  locale,
                  { weekday: "long", day: "numeric", month: "long" }
                )}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Titel</label>
            <Input
              value={blockTitle}
              onChange={(e) => setBlockTitle(e.target.value)}
              placeholder="[ViaCust] Bezet/Verlof"
            />
            <p className="text-[11px] text-muted-foreground">
              Er wordt een hele-dag-afspraak aangemaakt op je gekoppelde agenda.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setBlockOpen(false)} disabled={blocking}>
              Annuleren
            </Button>
            <Button size="sm" onClick={submitBlock} disabled={blocking}>
              {blocking ? "Bezig…" : "Blokkeer dag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
