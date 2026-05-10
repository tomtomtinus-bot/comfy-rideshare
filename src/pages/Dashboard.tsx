import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { GoogleAgendaStatus } from "@/components/site/GoogleAgendaStatus";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const localeFromI18n = (lang: string) => {
  switch (lang) {
    case "en": return "en-GB";
    case "de": return "de-DE";
    case "fr": return "fr-FR";
    default: return "nl-NL";
  }
};

const fmtHours = (min: number) => {
  const total = Math.ceil(min / 15) * 15;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
};

const QUARTER_TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

interface RideRow {
  id: string;
  client_id: string;
  pickup_address: string;
  pickup_city: string;
  dropoff_address: string;
  dropoff_city: string;
  scheduled_at: string;
  num_escorts: number;
  status: string;
  notes: string | null;
  app_fee: number;
  cargo_length_m?: number | null;
  cargo_width_m?: number | null;
  cargo_height_m?: number | null;
  cargo_weight_t?: number | null;
  permit_number?: string | null;
  permit_id?: string | null;
  client_reference?: string | null;
  escort_type_required?: string | null;
}

interface AssignmentRow {
  id: string;
  ride_id: string;
  escort_id: string;
  travel_to_pickup_min: number;
  travel_back_home_min: number;
  estimated_hours: number | null;
  estimated_cost: number | null;
  actual_hours: number | null;
  actual_cost: number | null;
  hours_submitted_at: string | null;
  hours_notes: string | null;
  status: "invited" | "accepted" | "declined" | "expired" | "cancelled";
  invited_at: string;
  responds_by: string;
  responded_at: string | null;
}

const fmtDate = (d: string, lang = "nl") =>
  new Date(d).toLocaleString(localeFromI18n(lang), { dateStyle: "medium", timeStyle: "short" });

type DateBucketKey = "vandaag" | "morgen" | "deze_week" | "later" | "eerder";
const DATE_BUCKET_TKEYS: Record<DateBucketKey, string> = {
  vandaag: "bucket.today",
  morgen: "bucket.tomorrow",
  deze_week: "bucket.thisWeek",
  later: "bucket.later",
  eerder: "bucket.earlier",
};
const DATE_BUCKET_ORDER: DateBucketKey[] = ["vandaag", "morgen", "deze_week", "later", "eerder"];

const dateBucketKey = (iso: string): DateBucketKey => {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const today = startOfDay(now);
  const target = startOfDay(d);
  const diffDays = Math.round((+target - +today) / 86400000);
  if (diffDays < 0) return "eerder";
  if (diffDays === 0) return "vandaag";
  if (diffDays === 1) return "morgen";
  // rest of current ISO-week (week starts Monday)
  const weekday = (today.getDay() + 6) % 7; // 0=Mon..6=Sun
  const daysLeftInWeek = 6 - weekday;
  if (diffDays <= daysLeftInWeek) return "deze_week";
  return "later";
};

function groupByDateBucket<T>(
  list: T[],
  getDate: (item: T) => string,
  order: "asc" | "desc",
  t: (k: string) => string,
): { key: DateBucketKey; label: string; items: T[] }[] {
  const map = new Map<DateBucketKey, T[]>();
  for (const it of list) {
    const k = dateBucketKey(getDate(it));
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(it);
  }
  const sortedOrder = order === "asc"
    ? DATE_BUCKET_ORDER
    : [...DATE_BUCKET_ORDER].reverse();
  return sortedOrder
    .filter((k) => map.has(k))
    .map((k) => ({
      key: k,
      label: t(DATE_BUCKET_TKEYS[k]),
      items: map.get(k)!.sort((a, b) =>
        order === "asc"
          ? +new Date(getDate(a)) - +new Date(getDate(b))
          : +new Date(getDate(b)) - +new Date(getDate(a)),
      ),
    }));
}

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const known = ["open","matched","in_progress","completed","cancelled","invited","accepted","declined","expired"];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brass-gold">
      <span className="size-1.5 rounded-full bg-brass-gold" />
      {known.includes(status) ? t(`status.${status}`) : status}
    </span>
  );
};

const minutesLeft = (deadline: string) => {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.floor(ms / 60000));
};

const ClientDashboard = () => {
  const { t, i18n } = useTranslation();
  const fd = (d: string) => fmtDate(d, i18n.language);
  const { user } = useAuth();
  const [rides, setRides] = useState<RideRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, (AssignmentRow & { anon: string; rate: number })[]>>({});
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [escortNames, setEscortNames] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data: rs } = await supabase
        .from("rides")
        .select("*")
        .eq("client_id", user.id)
        .is("platform_invoice_id", null)
        .order("scheduled_at", { ascending: false });

      const list = rs ?? [];
      setRides(list);

      if (list.length) {
        const ids = list.map((r) => r.id);
        const { data: ass } = await supabase
          .from("ride_assignments")
          .select("*")
          .in("ride_id", ids);

        const escortIds = [...new Set((ass ?? []).map((a) => a.escort_id))];
        const { data: escorts } = await supabase
          .from("escort_profiles")
          .select("id, anonymous_id, hourly_rate")
          .in("id", escortIds);
        const escortMap = new Map((escorts ?? []).map((e) => [e.id, e]));

        const grouped: Record<string, (AssignmentRow & { anon: string; rate: number })[]> = {};
        (ass ?? []).forEach((a) => {
          const e = escortMap.get(a.escort_id);
          (grouped[a.ride_id] ||= []).push({
            ...a,
            anon: e?.anonymous_id ?? "—",
            rate: Number(e?.hourly_rate ?? 0),
          });
        });
        setAssignments(grouped);

        const acceptedAssignmentIds = (ass ?? [])
          .filter((a: any) => a.status === "accepted" || a.hours_submitted_at)
          .map((a: any) => a.id as string);
        if (acceptedAssignmentIds.length) {
          const results = await Promise.all(
            acceptedAssignmentIds.map(async (id) => {
              const { data } = await supabase.rpc("get_counterparty_name", { _assignment_id: id });
              const row = (data as any[])?.[0];
              return [id, row?.name as string | undefined] as const;
            }),
          );
          const next: Record<string, string> = {};
          results.forEach(([id, name]) => {
            if (name) next[id] = name;
          });
          setEscortNames(next);
        }
      }
      setLoading(false);
    })();
  }, [user]);

  const exportXlsx = () => {
    let filtered = rides;
    if (exportFrom) {
      const f = new Date(exportFrom).getTime();
      filtered = filtered.filter((r) => new Date(r.scheduled_at).getTime() >= f);
    }
    if (exportTo) {
      const endMs = new Date(exportTo).getTime() + 24 * 60 * 60 * 1000 - 1;
      filtered = filtered.filter((r) => new Date(r.scheduled_at).getTime() <= endMs);
    }
    if (filtered.length === 0) return toast.error(t("dash.noRidesInRange"));
    const rows = filtered.map((r) => {
      const ass = assignments[r.id] ?? [];
      const escortIds = ass.map((a) => `#${a.anon}`).join(", ");
      const totalEst = ass.reduce((s, a) => s + Number(a.estimated_cost ?? 0), 0);
      const totalActual = ass.reduce((s, a) => s + Number(a.actual_cost ?? 0), 0);
      const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
      return {
        [t("common.date")]: fd(r.scheduled_at),
        [t("xlsx.rideId")]: r.id.slice(0, 8),
        [t("xlsx.reference")]: r.client_reference ?? "",
        [t("xlsx.permit")]: r.permit_number ?? "",
        [t("xlsx.pickup")]: `${r.pickup_address} (${r.pickup_city})`,
        [t("xlsx.dropoff")]: `${r.dropoff_address} (${r.dropoff_city})`,
        [t("xlsx.numEscorts")]: r.num_escorts,
        [t("xlsx.escorts")]: escortIds,
        [t("xlsx.status")]: r.status,
        [t("xlsx.estCost")]: +totalEst.toFixed(2),
        [t("xlsx.actualCost")]: allSubmitted ? +totalActual.toFixed(2) : null,
        [t("xlsx.serviceFee")]: Number(r.app_fee ?? 0),
        [t("xlsx.totalIncl")]: allSubmitted ? +(totalActual + Number(r.app_fee ?? 0)).toFixed(2) : null,
        [t("xlsx.notes")]: r.notes ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((k) => ({ wch: Math.max(k.length, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t("dash.myRides"));
    const range = exportFrom || exportTo ? `-${exportFrom || "begin"}_tot_${exportTo || "eind"}` : "";
    XLSX.writeFile(wb, `rittenadministratie${range}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(t("dash.excelDownloaded"));
    setExportOpen(false);
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            {t("dash.clientKicker")}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">{t("dash.myRides")}</h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setExportOpen((v) => !v)}
            disabled={rides.length === 0}
            className="px-6 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors disabled:opacity-50"
          >
            {t("dash.downloadExcel")}
          </button>
          <Link
            to="/aanvragen"
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
          >
            {t("dash.newRequest")}
          </Link>
        </div>
      </header>

      {exportOpen && (
        <div className="bg-card shadow-etched p-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("dash.from")}</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("dash.to")}</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <button
            onClick={() => { setExportFrom(""); setExportTo(""); }}
            className="px-4 py-2 text-xs uppercase tracking-widest text-brass-deep/60 hover:text-brass-deep"
          >
            {t("common.clear")}
          </button>
          <button
            onClick={exportXlsx}
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
          >
            {t("dash.export")}
          </button>
          <p className="text-xs text-brass-deep/50 ml-auto">{t("dash.exportEmptyHint")}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-brass-deep/50">{t("common.loading")}</p>
      ) : rides.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60 mb-6">{t("dash.noRidesYet")}</p>
          <Link to="/aanvragen" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
            {t("dash.requestFirst")}
          </Link>
        </div>
      ) : (() => {
        const categorize = (r: RideRow) => {
          const ass = assignments[r.id] ?? [];
          const allSubmitted = ass.length > 0 && ass.every((a) => a.hours_submitted_at);
          if (r.status === "completed" || allSubmitted) return "afgerond";
          const hasAccepted = ass.some((a) => a.status === "accepted");
          if (hasAccepted) return "geaccepteerd";
          return "openstaand";
        };
        const buckets = {
          openstaand: rides.filter((r) => categorize(r) === "openstaand"),
          geaccepteerd: rides.filter((r) => categorize(r) === "geaccepteerd"),
          afgerond: rides.filter((r) => categorize(r) === "afgerond"),
        };

        const renderList = (list: RideRow[], bucketKey: "openstaand" | "geaccepteerd" | "afgerond") => {
          if (list.length === 0) {
            return <p className="text-sm text-brass-deep/50 p-6">{t("dash.noRidesInBucket")}</p>;
          }
          const order: "asc" | "desc" = bucketKey === "afgerond" ? "desc" : "asc";
          const groups = groupByDateBucket(list, (r) => r.scheduled_at, order, t);
          const renderRide = (r: RideRow) => {
            const ass = assignments[r.id] ?? [];
            const acceptedCount = ass.filter((a) => a.status === "accepted").length;
            return (
              <li key={r.id}>
                <Link
                  to={`/rit/${r.id}`}
                  className="flex items-center gap-4 bg-card px-5 py-4 hover:bg-parchment/40 transition-colors"
                >
                  <div className="w-28 shrink-0">
                    <p className="font-medium tabular-nums text-sm">{fd(r.scheduled_at)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {r.pickup_city}
                      <span className="text-brass-gold mx-2">→</span>
                      {r.dropoff_city}
                    </p>
                  </div>
                  <div className="shrink-0 hidden sm:flex items-center gap-3">
                    {acceptedCount > 0 && (
                      <span className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-semibold tabular-nums">
                        {t("dash.nEscorts", { accepted: acceptedCount, total: r.num_escorts ?? ass.length, plural: acceptedCount === 1 ? "" : "s" })}
                      </span>
                    )}
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-brass-gold text-lg shrink-0">›</span>
                </Link>
              </li>
            );
          };
          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.key}>
                  <header className="flex items-end justify-between mb-3">
                    <h3 className="font-display text-lg text-brass-deep">{g.label}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold tabular-nums">
                      {t("dash.nRidesShort", { count: g.items.length, plural: g.items.length === 1 ? "" : "ten" })}
                    </p>
                  </header>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brass-deep/10">{g.items.map(renderRide)}</ul>
                </section>
              ))}
            </div>
          );
        };

        return (
          <Tabs defaultValue="openstaand" className="w-full">
            <TabsList className="grid grid-cols-3 w-full md:w-auto md:inline-flex">
              <TabsTrigger value="openstaand">{t("dash.tabOpen")} ({buckets.openstaand.length})</TabsTrigger>
              <TabsTrigger value="geaccepteerd">{t("dash.tabAccepted")} ({buckets.geaccepteerd.length})</TabsTrigger>
              <TabsTrigger value="afgerond">{t("dash.tabDone")} ({buckets.afgerond.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="openstaand" className="mt-6">{renderList(buckets.openstaand, "openstaand")}</TabsContent>
            <TabsContent value="geaccepteerd" className="mt-6">{renderList(buckets.geaccepteerd, "geaccepteerd")}</TabsContent>
            <TabsContent value="afgerond" className="mt-6">{renderList(buckets.afgerond, "afgerond")}</TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
};

const hoursSchema = z.object({
  ride_start_date: z.string().min(1, "Startdatum vereist"),
  ride_start_time: z.string().min(1, "Starttijd vereist"),
  ride_end_date: z.string().min(1, "Einddatum vereist"),
  ride_end_time: z.string().min(1, "Eindtijd vereist"),
  hours_notes: z.string().trim().max(500).optional(),
});

type ExtraCost = { description: string; amount: number };

const EscortDashboard = () => {
  const { t, i18n } = useTranslation();
  const fd2 = (d: string) => fmtDate(d, i18n.language);
  const { user, isApproved } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<
    (AssignmentRow & {
      ride: RideRow;
      hourly_rate: number;
      is_be_ride: boolean;
      min_billable_hours: number;
      client_anon: string;
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [counterpartyNames, setCounterpartyNames] = useState<Record<string, string>>({});
  const [extraCosts, setExtraCosts] = useState<Record<string, ExtraCost[]>>({});
  const [googleBusy, setGoogleBusy] = useState<{ start: number; end: number }[]>([]);
  const [tick, setTick] = useState(0);

  const hasGoogleConflict = (scheduledAt: string) => {
    const ts = new Date(scheduledAt).getTime();
    return googleBusy.some((b) => b.start < ts + 60_000 && b.end > ts - 60_000);
  };

  const getExtras = (id: string) => extraCosts[id] ?? [];
  const setExtras = (id: string, next: ExtraCost[]) =>
    setExtraCosts((prev) => ({ ...prev, [id]: next }));
  const addExtra = (id: string) =>
    setExtras(id, [...getExtras(id), { description: "", amount: 0 }]);
  const updateExtra = (id: string, idx: number, patch: Partial<ExtraCost>) => {
    const list = [...getExtras(id)];
    list[idx] = { ...list[idx], ...patch };
    setExtras(id, list);
  };
  const removeExtra = (id: string, idx: number) =>
    setExtras(id, getExtras(id).filter((_, i) => i !== idx));

  // Tick every 30s for the countdown timer
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: a } = await supabase
      .from("ride_assignments")
      .select("*")
      .eq("escort_id", user.id)
      .is("invoiced_at", null);
    const list = a ?? [];

    const rideIds = list.map((x) => x.ride_id);
    const { data: rides } = await supabase.from("rides").select("*").in("id", rideIds);
    const clientIds = [...new Set((rides ?? []).map((r) => r.client_id))];
    const { data: clients } = await supabase
      .from("profiles")
      .select("id, anonymous_id")
      .in("id", clientIds);
    const clientMap = new Map((clients ?? []).map((c) => [c.id, c.anonymous_id]));

    const { data: me } = await supabase
      .from("escort_profiles")
      .select("hourly_rate, hourly_rate_be, min_billable_hours")
      .eq("id", user.id)
      .maybeSingle();

    const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));
    const merged = list
      .map((x) => {
        const ride = rideMap.get(x.ride_id) as RideRow | undefined;
        const isBe = ride
          ? /belgi|brussel|antwerp|gent|luik|liege|brugge|charleroi|namur|namen|leuven|mechelen|hasselt|kortrijk/i.test(
              `${ride.pickup_city ?? ""} ${ride.dropoff_city ?? ""} ${ride.pickup_address ?? ""} ${ride.dropoff_address ?? ""}`,
            )
          : false;
        const rate = isBe
          ? Number((me as any)?.hourly_rate_be ?? me?.hourly_rate ?? 0)
          : Number(me?.hourly_rate ?? 0);
        return {
          ...x,
          ride: ride as RideRow,
          hourly_rate: rate,
          is_be_ride: isBe,
          min_billable_hours: Number((me as any)?.min_billable_hours ?? 0),
          client_anon: ride ? clientMap.get(ride.client_id) ?? "—" : "—",
        };
      })
      .filter((x) => x.ride)
      .sort((a, b) => {
        // Show invited first, then by date
        if (a.status === "invited" && b.status !== "invited") return -1;
        if (b.status === "invited" && a.status !== "invited") return 1;
        return new Date(b.ride.scheduled_at).getTime() - new Date(a.ride.scheduled_at).getTime();
      });

    setItems(merged);
    setLoading(false);

    // Google Agenda bezet-vensters ophalen voor waarschuwing bij uitnodigingen
    try {
      const { data: g } = await supabase.functions.invoke("google-calendar-sync");
      if (g && (g as any).connected && Array.isArray((g as any).busy)) {
        setGoogleBusy(
          ((g as any).busy as { start: string; end: string }[]).map((b) => ({
            start: new Date(b.start).getTime(),
            end: new Date(b.end).getTime(),
          })),
        );
      } else {
        setGoogleBusy([]);
      }
    } catch (_) {
      setGoogleBusy([]);
    }

    // Resolve real names for accepted assignments only
    const acceptedIds = merged
      .filter((m) => m.status === "accepted" || m.hours_submitted_at)
      .map((m) => m.id);
    if (acceptedIds.length) {
      const results = await Promise.all(
        acceptedIds.map(async (id) => {
          const { data } = await supabase.rpc("get_counterparty_name", { _assignment_id: id });
          const row = (data as any[])?.[0];
          return [id, row?.name as string | undefined] as const;
        }),
      );
      const next: Record<string, string> = {};
      results.forEach(([id, name]) => {
        if (name) next[id] = name;
      });
      setCounterpartyNames(next);
    }
  };

  useEffect(() => {
    load();
    if (!user) return;
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    // Realtime: new invitations
    const channel = supabase
      .channel(`escort-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ride_assignments", filter: `escort_id=eq.${user.id}` },
        () => {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(t("dash.newInvitation"), {
              body: t("dash.newInvitationBody"),
            });
          }
          toast.info(t("dash.newInvitationToast"));
          load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const respond = async (id: string, accept: boolean) => {
    if (!isApproved) {
      return toast.error(t("dash.needsApproval"));
    }
    if (accept) {
      const it = items.find((x) => x.id === id);
      if (it && hasGoogleConflict(it.ride.scheduled_at)) {
        const ok = window.confirm(t("dash.googleConfirm"));
        if (!ok) return;
      }
    }
    const { error } = await supabase
      .from("ride_assignments")
      .update({
        status: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    if (accept) {
      const { error: nErr } = await supabase.rpc("notify_ride_confirmed", { _assignment_id: id });
      if (nErr) console.warn("notify_ride_confirmed:", nErr.message);
      toast.success(t("dash.rideConfirmed"));
    } else {
      toast.success(t("dash.rideDeclined"));
    }
    load();
  };
  void tick;

  const submitHours = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = hoursSchema.safeParse({
      ride_start_date: fd.get("ride_start_date"),
      ride_start_time: fd.get("ride_start_time"),
      ride_end_date: fd.get("ride_end_date"),
      ride_end_time: fd.get("ride_end_time"),
      hours_notes: fd.get("hours_notes"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    const rideStart = new Date(`${parsed.data.ride_start_date}T${parsed.data.ride_start_time}`);
    const rideEnd = new Date(`${parsed.data.ride_end_date}T${parsed.data.ride_end_time}`);
    if (isNaN(rideStart.getTime()) || isNaN(rideEnd.getTime())) return toast.error(t("dash.invalidDateTime"));
    if (rideStart.getMinutes() % 15 !== 0 || rideEnd.getMinutes() % 15 !== 0) {
      return toast.error(t("dash.quarterTimes"));
    }
    if (rideEnd <= rideStart) return toast.error(t("dash.endAfterStart"));

    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Reistijd afronden naar boven op kwartieren
    const ceilQuarter = (min: number) => Math.ceil(min / 15) * 15;
    const travelTo = ceilQuarter(item.travel_to_pickup_min);
    const travelBack = ceilQuarter(item.travel_back_home_min);
    // Vertrek standplaats = starttijd rit − reistijd heen
    // Terug standplaats = eindtijd rit + reistijd terug
    const start = new Date(rideStart.getTime() - travelTo * 60_000);
    const end = new Date(rideEnd.getTime() + travelBack * 60_000);

    const rawHours = +((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2);
    // Minimumtarief op urenbasis toepassen
    const billableHours = Math.max(rawHours, item.min_billable_hours || 0);
    const hours = +billableHours.toFixed(2);
    const baseCost = +(hours * item.hourly_rate).toFixed(2);

    // Extra kosten: opschonen + valideren
    const extrasRaw = getExtras(id);
    const extras: ExtraCost[] = extrasRaw
      .map((e) => ({ description: (e.description ?? "").trim(), amount: Number(e.amount) || 0 }))
      .filter((e) => e.description.length > 0 || e.amount > 0);
    if (extras.some((e) => !e.description || e.amount <= 0)) {
      return toast.error(t("dash.extraCostsValid"));
    }
    const extrasTotal = +extras.reduce((s, e) => s + e.amount, 0).toFixed(2);
    const cost = +(baseCost + extrasTotal).toFixed(2);

    const { error } = await supabase
      .from("ride_assignments")
      .update({
        departed_base_at: start.toISOString(),
        returned_base_at: end.toISOString(),
        actual_hours: hours,
        actual_cost: cost,
        extra_costs: extras as never,
        extra_costs_total: extrasTotal,
        hours_notes: parsed.data.hours_notes || null,
        hours_submitted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return toast.error(error.message);

    // Mark ride completed if all assignments submitted
    const { data: remaining } = await supabase
      .from("ride_assignments")
      .select("id, hours_submitted_at")
      .eq("ride_id", item.ride_id);
    if ((remaining ?? []).every((r) => r.hours_submitted_at)) {
      await supabase.from("rides").update({ status: "completed" }).eq("id", item.ride_id);
    }

    toast.success("Uren geregistreerd");
    setOpenId(null);
    load();
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
            Begeleider
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Mijn opdrachten</h1>
        </div>
        <Link
          to="/profiel"
          className="px-6 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
        >
          Mijn profiel
        </Link>
      </header>

      {user && <GoogleAgendaStatus />}

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : items.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60">U heeft nog geen toegewezen ritten.</p>
        </div>
      ) : (() => {
        const isExpired = (a: typeof items[number]) =>
          a.status === "invited" && new Date(a.responds_by).getTime() <= Date.now();
        const categorize = (a: typeof items[number]) => {
          if (a.status === "expired" || isExpired(a)) return "verlopen";
          if (a.hours_submitted_at) return "afgerond";
          if (a.status === "accepted") return "geaccepteerd";
          if (a.status === "invited") return "openstaand";
          return "afgerond"; // declined / cancelled bij historie
        };
        const buckets = {
          openstaand: items.filter((a) => categorize(a) === "openstaand"),
          geaccepteerd: items.filter((a) => categorize(a) === "geaccepteerd"),
          afgerond: items.filter((a) => categorize(a) === "afgerond"),
          verlopen: items.filter((a) => categorize(a) === "verlopen"),
        };

        const renderItem = (a: typeof items[number]) => {
          const submitted = !!a.hours_submitted_at;
          const isInvited = a.status === "invited";
          const minsLeft = isInvited ? minutesLeft(a.responds_by) : 0;
          const expired = isInvited && minsLeft === 0;
          const accepted = a.status === "accepted";
          const clickable = accepted || isInvited;
          return (
            <li
              key={a.id}
              onClick={clickable ? () => navigate(`/opdracht/${a.ride.id}`) : undefined}
              className={`bg-card ${isInvited && !expired ? "ring-2 ring-inset ring-brass-gold" : ""} ${clickable ? "cursor-pointer hover:bg-parchment/40 transition-colors" : ""}`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-28 shrink-0">
                  <p className="font-medium tabular-nums text-sm">{fmtDate(a.ride.scheduled_at)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {a.ride.pickup_city}
                    <span className="text-brass-gold mx-2">→</span>
                    {a.ride.dropoff_city}
                  </p>
                </div>
                <div className="shrink-0 hidden sm:block">
                  <StatusBadge status={a.status} />
                </div>
                <div className="shrink-0">
                  {isInvited && !expired ? (
                    <div className="flex items-center gap-2">
                      {hasGoogleConflict(a.ride.scheduled_at) && (
                        <span
                          title="Je hebt op dit moment een afspraak in je Google Agenda"
                          className="text-[10px] uppercase tracking-widest text-destructive font-bold whitespace-nowrap"
                        >
                          ⚠ Agenda-conflict
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-widest text-brass-gold font-bold whitespace-nowrap">
                        Nog {minsLeft} min
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); respond(a.id, true); }}
                        className="px-3 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                      >
                        Accepteer
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); respond(a.id, false); }}
                        className="px-3 py-2 border border-brass-deep/30 text-brass-deep text-xs uppercase tracking-widest font-semibold hover:bg-parchment transition-colors"
                      >
                        Weiger
                      </button>
                    </div>
                  ) : expired ? (
                    <span className="text-xs uppercase tracking-widest text-brass-deep/40 font-semibold">
                      Verlopen
                    </span>
                  ) : submitted ? (
                    <span className="text-xs uppercase tracking-widest text-brass-gold font-semibold tabular-nums">
                      ✓ {a.actual_hours}u · €{Number(a.actual_cost).toFixed(2)}
                    </span>
                  ) : accepted ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenId(openId === a.id ? null : a.id); }}
                      className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                    >
                      Uren invullen
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-widest text-brass-deep/40 font-semibold">—</span>
                  )}
                </div>
                {clickable && <span className="text-brass-gold text-lg shrink-0">›</span>}
              </div>

              {openId === a.id && (
                <form
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => submitHours(a.id, e)}
                  className="px-5 pb-5 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-brass-deep/10"
                >
                  <div className="md:col-span-2 bg-parchment/60 border border-brass-deep/10 px-4 py-3 text-xs text-brass-deep/70 space-y-1">
                    <div>
                      <strong>Geplande boekingstijd:</strong>{" "}
                      {new Date(a.ride.scheduled_at).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <div>
                      <strong>Reistijd vanaf standplaats:</strong> {fmtHours(a.travel_to_pickup_min)} ·{" "}
                      <strong>terug:</strong> {fmtHours(a.travel_back_home_min)} (afgerond op kwartier)
                    </div>
                  </div>
                  {(() => {
                    const sched = new Date(a.ride.scheduled_at);
                    const pad = (n: number) => String(n).padStart(2, "0");
                    const defDate = `${sched.getFullYear()}-${pad(sched.getMonth() + 1)}-${pad(sched.getDate())}`;
                    const roundedMin = Math.round(sched.getMinutes() / 15) * 15;
                    const rh = roundedMin === 60 ? sched.getHours() + 1 : sched.getHours();
                    const rm = roundedMin === 60 ? 0 : roundedMin;
                    const defTime = `${pad(rh % 24)}:${pad(rm)}`;
                    return (
                      <>
                        <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                          Starttijd rit (op pickup)
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Datum</label>
                          <input
                            name="ride_start_date"
                            type="date"
                            defaultValue={defDate}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Tijd</label>
                          <select
                            name="ride_start_time"
                            defaultValue={defTime}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          >
                            {QUARTER_TIMES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mt-2">
                          Eindtijd rit (op dropoff)
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Datum</label>
                          <input
                            name="ride_end_date"
                            type="date"
                            defaultValue={defDate}
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest text-brass-deep/45 font-semibold">Tijd</label>
                          <select
                            name="ride_end_time"
                            defaultValue=""
                            required
                            className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                          >
                            <option value="" disabled>Kies tijd…</option>
                            {QUARTER_TIMES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    );
                  })()}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                      Toelichting (optioneel)
                    </label>
                    <textarea
                      name="hours_notes"
                      rows={2}
                      className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 border-t border-brass-deep/10">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
                        Extra kosten (optioneel)
                      </label>
                      <button
                        type="button"
                        onClick={() => addExtra(a.id)}
                        className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
                      >
                        + Regel toevoegen
                      </button>
                    </div>
                    {getExtras(a.id).length === 0 ? (
                      <p className="text-xs text-brass-deep/45">
                        Bijv. tol, parkeren, veerboot, extra materiaal — wordt op de factuur als losse regel meegenomen.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {getExtras(a.id).map((ec, idx) => (
                          <li key={idx} className="grid grid-cols-12 gap-2 items-center">
                            <input
                              type="text"
                              value={ec.description}
                              onChange={(e) => updateExtra(a.id, idx, { description: e.target.value })}
                              placeholder="Omschrijving (bijv. tol, parkeren)"
                              maxLength={120}
                              className="col-span-7 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                            />
                            <div className="col-span-4 relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brass-deep/50 text-sm">€</span>
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={ec.amount === 0 ? "" : ec.amount}
                                onChange={(e) =>
                                  updateExtra(a.id, idx, { amount: e.target.value === "" ? 0 : Number(e.target.value) })
                                }
                                placeholder="0,00"
                                className="w-full bg-parchment border border-brass-deep/15 pl-7 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeExtra(a.id, idx)}
                              aria-label="Verwijder regel"
                              className="col-span-1 text-brass-deep/50 hover:text-red-700 text-lg leading-none"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {getExtras(a.id).length > 0 && (
                      <p className="text-xs text-brass-deep/60 mt-2 tabular-nums text-right">
                        Subtotaal extra kosten: €
                        {getExtras(a.id)
                          .reduce((s, e) => s + (Number(e.amount) || 0), 0)
                          .toFixed(2)}
                      </p>
                    )}
                  </div>

                  <p className="md:col-span-2 text-xs text-brass-deep/55">
                    Tarief {a.is_be_ride ? "België" : "Nederland"}: €{a.hourly_rate}/uur{a.is_be_ride ? " (grensoverschrijdend → BE-tarief op alle uren)" : ""} · Totale uren = reistijd heen + rit-uren + reistijd terug. Vertrek/terug standplaats worden automatisch berekend.{a.min_billable_hours > 0 ? ` · Minimum afrekening: ${a.min_billable_hours} uur.` : ""} Extra kosten worden los op de factuur vermeld.
                  </p>
                  <button className="md:col-span-2 px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">
                    Versturen
                  </button>
                </form>
              )}
            </li>
          );
        };

        const renderList = (list: typeof items, bucketKey: "openstaand" | "geaccepteerd" | "afgerond" | "verlopen") => {
          if (list.length === 0) {
            return <p className="text-sm text-brass-deep/50 p-6">Geen ritten in deze categorie.</p>;
          }
          const order: "asc" | "desc" = bucketKey === "afgerond" || bucketKey === "verlopen" ? "desc" : "asc";
          const groups = groupByDateBucket(list, (a) => a.ride.scheduled_at, order, t);
          return (
            <div className="space-y-8">
              {groups.map((g) => (
                <section key={g.key}>
                  <header className="flex items-end justify-between mb-3">
                    <h3 className="font-display text-lg text-brass-deep">{g.label}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold tabular-nums">
                      {g.items.length} rit{g.items.length === 1 ? "" : "ten"}
                    </p>
                  </header>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-px bg-brass-deep/10">{g.items.map(renderItem)}</ul>
                </section>
              ))}
            </div>
          );
        };

        return (
          <Tabs defaultValue="openstaand" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto md:inline-flex">
              <TabsTrigger value="openstaand">Openstaand ({buckets.openstaand.length})</TabsTrigger>
              <TabsTrigger value="geaccepteerd">Geaccepteerd ({buckets.geaccepteerd.length})</TabsTrigger>
              <TabsTrigger value="afgerond">Afgerond ({buckets.afgerond.length})</TabsTrigger>
              <TabsTrigger value="verlopen">Verlopen ({buckets.verlopen.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="openstaand" className="mt-6">{renderList(buckets.openstaand, "openstaand")}</TabsContent>
            <TabsContent value="geaccepteerd" className="mt-6">{renderList(buckets.geaccepteerd, "geaccepteerd")}</TabsContent>
            <TabsContent value="afgerond" className="mt-6">{renderList(buckets.afgerond, "afgerond")}</TabsContent>
            <TabsContent value="verlopen" className="mt-6">{renderList(buckets.verlopen, "verlopen")}</TabsContent>
          </Tabs>
        );
      })()}
    </div>
  );
};

const DashboardInner = () => {
  const { role, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : role === "begeleider" ? (
            <EscortDashboard />
          ) : (
            <ClientDashboard />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Dashboard = () => (
  <RequireAuth>
    <DashboardInner />
  </RequireAuth>
);

export default Dashboard;
