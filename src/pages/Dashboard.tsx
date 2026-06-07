import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useCompany } from "@/hooks/useCompany";
import { DriverDashboard } from "@/pages/DriverDashboard";
import { InstallAppBanner } from "@/components/InstallAppBanner";
import { GoogleAgendaStatus } from "@/components/site/GoogleAgendaStatus";
import CurrentLocationCard from "@/components/site/CurrentLocationCard";
import ScheduledLocationsCard from "@/components/site/ScheduledLocationsCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronDown, ChevronRight } from "lucide-react";
import { distanceKm } from "@/lib/geo";

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
  ride_number?: string | null;
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
  bundle_id?: string | null;
  bundle_label?: string | null;
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
  hours_dispute_status?: string | null;
  hours_dispute_reason?: string | null;
  hours_disputed_at?: string | null;
  status: "invited" | "accepted" | "declined" | "expired" | "cancelled";
  invited_at: string;
  responds_by: string;
  responded_at: string | null;
  interest_expressed_at: string | null;
  interest_score: number | null;
  broadcast_closes_at: string | null;
}

const fmtDate = (d: string, lang = "nl") =>
  new Date(d).toLocaleString(localeFromI18n(lang), { dateStyle: "medium", timeStyle: "short" });

const fmtCompact = (d: string) => {
  const x = new Date(d);
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yyyy = x.getFullYear();
  const hh = String(x.getHours()).padStart(2, "0");
  const mi = String(x.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
};

const displayRideNo = (r: { ride_number?: string | null; id: string }) =>
  r.ride_number ?? `#${r.id.slice(0, 8).toUpperCase()}`;

type StatusKind = "open" | "matched" | "in_progress" | "completed" | "cancelled" | "invited" | "accepted" | "declined" | "expired";
const statusBadgeClasses = (s: string): string => {
  switch (s) {
    case "open": return "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200";
    case "matched": return "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200";
    case "in_progress": return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200";
    case "completed": return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
    case "cancelled": return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
    case "invited": return "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200";
    case "accepted": return "bg-green-100 text-green-800 hover:bg-green-100 border-green-200";
    case "declined": return "bg-red-100 text-red-800 hover:bg-red-100 border-red-200";
    case "expired": return "bg-muted text-muted-foreground hover:bg-muted border-border";
    default: return "bg-muted text-muted-foreground hover:bg-muted border-border";
  }
};
const TableStatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const known = ["open","matched","in_progress","completed","cancelled","invited","accepted","declined","expired"];
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${statusBadgeClasses(status)}`}>
      {known.includes(status) ? t(`status.${status}`) : status}
    </Badge>
  );
};

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
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = (k: string) => setCollapsedSections((prev) => {
    const n = new Set(prev);
    n.has(k) ? n.delete(k) : n.add(k);
    return n;
  });
  const navigate = useNavigate();
  const addRideToBundle = (r: RideRow) => {
    if (!r.bundle_id || !r.bundle_label) return;
    navigate(`/aanvragen?bundle=${r.bundle_id}&label=${encodeURIComponent(r.bundle_label)}`);
  };

  useEffect(() => {
    (async () => {
      if (!user) return;

      // Auto-annuleer eigen openstaande ritten waarvan de geplande datum > 3 dagen
      // verstreken is EN waarvoor geen enkele begeleider geaccepteerd heeft of uren
      // heeft ingediend. Zo blijven ritten met geaccepteerde/afgehandelde begeleiders staan.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stale } = await supabase
        .from("rides")
        .select("id")
        .eq("client_id", user.id)
        .eq("status", "open")
        .lt("scheduled_at", threeDaysAgo);
      const candidateIds = (stale ?? []).map((r: any) => r.id);
      if (candidateIds.length) {
        const { data: liveAss } = await supabase
          .from("ride_assignments")
          .select("ride_id, status, hours_submitted_at")
          .in("ride_id", candidateIds);
        const keepIds = new Set(
          (liveAss ?? [])
            .filter((a: any) => a.status === "accepted" || a.hours_submitted_at)
            .map((a: any) => a.ride_id)
        );
        const toCancel = candidateIds.filter((id) => !keepIds.has(id));
        if (toCancel.length) {
          await supabase.from("rides").update({ status: "cancelled" as any }).in("id", toCancel);
          await supabase
            .from("ride_assignments")
            .update({ status: "cancelled" as any })
            .in("ride_id", toCancel)
            .in("status", ["invited"]);
        }
      }

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
          .from("escort_profiles_public")
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

  const exportXlsx = async () => {
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

    // Haal factuurregels op voor toegewezen ritten (voor brandstoftoeslag-uitsplitsing).
    const allAssignments = filtered.flatMap((r) => assignments[r.id] ?? []);
    const invoicedIds = allAssignments
      .map((a) => (a as any).invoice_id as string | null)
      .filter((v): v is string => !!v);
    const itemsByAssignment: Record<string, { base: number; fuel: number }> = {};
    if (invoicedIds.length) {
      const { data: items } = await supabase
        .from("invoice_items")
        .select("ride_assignment_id, description, amount")
        .in("invoice_id", [...new Set(invoicedIds)]);
      (items ?? []).forEach((it: any) => {
        const aid = it.ride_assignment_id as string;
        const desc = (it.description ?? "").toLowerCase();
        const amt = Number(it.amount) || 0;
        const bucket = (itemsByAssignment[aid] ||= { base: 0, fuel: 0 });
        if (/brandstof|fuel/.test(desc)) bucket.fuel += amt;
        else bucket.base += amt;
      });
    }

    const rows: Record<string, unknown>[] = [];
    filtered.forEach((r) => {
      const ass = assignments[r.id] ?? [];
      if (ass.length === 0) {
        rows.push({
          [t("common.date")]: fd(r.scheduled_at),
          [t("xlsx.rideId")]: r.id.slice(0, 8),
          [t("xlsx.reference")]: r.client_reference ?? "",
          [t("xlsx.permit")]: r.permit_number ?? "",
          [t("xlsx.pickup")]: `${r.pickup_address} (${r.pickup_city})`,
          [t("xlsx.dropoff")]: `${r.dropoff_address} (${r.dropoff_city})`,
          [t("xlsx.escort")]: "",
          [t("xlsx.hours")]: null,
          [t("xlsx.baseCost")]: null,
          [t("xlsx.fuelSurcharge")]: null,
          [t("xlsx.extraCosts")]: null,
          [t("xlsx.serviceFee")]: Number(r.app_fee ?? 0),
          [t("xlsx.totalCost")]: null,
          [t("xlsx.status")]: r.status,
          [t("xlsx.notes")]: r.notes ?? "",
        });
        return;
      }
      ass.forEach((a, idx) => {
        const submitted = !!a.hours_submitted_at;
        const extras = Number((a as any).extra_costs_total ?? 0);
        const invBuckets = itemsByAssignment[a.id];
        const base = invBuckets
          ? +invBuckets.base.toFixed(2)
          : submitted
            ? +(Number(a.actual_cost ?? 0) - extras).toFixed(2)
            : 0;
        const fuel = invBuckets ? +invBuckets.fuel.toFixed(2) : 0;
        const fee = idx === 0 ? Number(r.app_fee ?? 0) : 0;
        const total = submitted || invBuckets
          ? +(base + fuel + extras + fee).toFixed(2)
          : null;
        rows.push({
          [t("common.date")]: fd(r.scheduled_at),
          [t("xlsx.rideId")]: r.id.slice(0, 8),
          [t("xlsx.reference")]: r.client_reference ?? "",
          [t("xlsx.permit")]: r.permit_number ?? "",
          [t("xlsx.pickup")]: `${r.pickup_address} (${r.pickup_city})`,
          [t("xlsx.dropoff")]: `${r.dropoff_address} (${r.dropoff_city})`,
          [t("xlsx.escort")]: `#${a.anon}`,
          [t("xlsx.hours")]: submitted ? Number(a.actual_hours ?? 0) : null,
          [t("xlsx.baseCost")]: submitted || invBuckets ? base : null,
          [t("xlsx.fuelSurcharge")]: invBuckets ? fuel : null,
          [t("xlsx.extraCosts")]: submitted ? extras : null,
          [t("xlsx.serviceFee")]: fee,
          [t("xlsx.totalCost")]: total,
          [t("xlsx.status")]: idx === 0 ? r.status : "",
          [t("xlsx.notes")]: idx === 0 ? (r.notes ?? "") : "",
        });
      });
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(t("dash.myRides"));
    const headers = Object.keys(rows[0]);
    ws.columns = headers.map((k) => ({ header: k, key: k, width: Math.max(k.length, 14) }));
    rows.forEach((r) => ws.addRow(r));
    const range = exportFrom || exportTo ? `-${exportFrom || "begin"}_tot_${exportTo || "eind"}` : "";
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rittenadministratie${range}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("dash.excelDownloaded"));
    setExportOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("dash.myRides")}</h1>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen((v) => !v)}
            disabled={rides.length === 0}
          >
            {t("dash.downloadExcel")}
          </Button>
          <Button size="sm" asChild>
            <Link to="/aanvragen">{t("dash.newRequest")}</Link>
          </Button>
        </div>
      </header>

      {exportOpen && (
        <div className="bg-card shadow-etched p-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("dash.from")}</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">{t("dash.to")}</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="border border-brass-deep/30 px-3 py-2 text-sm bg-background"
            />
          </div>
          <button
            onClick={() => { setExportFrom(""); setExportTo(""); }}
            className="px-4 py-2 text-xs uppercase tracking-widest text-brass-deep/80 hover:text-brass-deep"
          >
            {t("common.clear")}
          </button>
          <button
            onClick={exportXlsx}
            className="px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors"
          >
            {t("dash.export")}
          </button>
          <p className="text-xs text-brass-deep/80 ml-auto">{t("dash.exportEmptyHint")}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-brass-deep/80">{t("common.loading")}</p>
      ) : rides.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/80 mb-6">{t("dash.noRidesYet")}</p>
          <Link to="/aanvragen" className="text-brass-gold uppercase tracking-widest text-xs font-semibold">
            {t("dash.requestFirst")}
          </Link>
        </div>
      ) : (() => {
        // Hide rides whose assignments are all invoiced
        const visible = rides.filter((r) => {
          const ass = assignments[r.id] ?? [];
          if (ass.length === 0) return true;
          return !ass.every((a) => (a as any).invoiced_at);
        });
        const q = clientSearch.trim().toLowerCase();
        const filtered = visible.filter((r) => {
          if (clientStatusFilter !== "all" && r.status !== clientStatusFilter) return false;
          if (!q) return true;
          return (
            (r.ride_number ?? "").toLowerCase().includes(q) ||
            r.pickup_city.toLowerCase().includes(q) ||
            r.dropoff_city.toLowerCase().includes(q) ||
            r.id.toLowerCase().includes(q)
          );
        });
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="matched">Toegewezen</SelectItem>
                  <SelectItem value="in_progress">Lopend</SelectItem>
                  <SelectItem value="completed">Voltooid</SelectItem>
                  <SelectItem value="cancelled">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="search"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Zoek op ritnummer of stad…"
                className="flex-1 min-w-[200px] h-9"
              />
            </div>
            {(() => {
              const now = new Date();
              const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
              const mondayOf = (d: Date) => {
                const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const day = (x.getDay() + 6) % 7;
                x.setDate(x.getDate() - day);
                return x;
              };

              const currentRides = filtered.filter((r) => new Date(r.scheduled_at).getTime() >= currentMonthStart);
              const pastRides = filtered.filter((r) => new Date(r.scheduled_at).getTime() < currentMonthStart);

              // Group current rides by week
              type WeekGroup = { key: string; label: string; sortKey: number; rides: typeof filtered };
              const weeks = new Map<string, WeekGroup>();
              for (const r of currentRides) {
                const d = new Date(r.scheduled_at);
                const wMon = mondayOf(d);
                const wKey = `w-${wMon.toISOString().slice(0, 10)}`;
                if (!weeks.has(wKey)) {
                  const wEnd = new Date(wMon); wEnd.setDate(wEnd.getDate() + 6);
                  const sameMonth = wMon.getMonth() === wEnd.getMonth();
                  const label = sameMonth
                    ? `Week ${wMon.getDate()}–${wEnd.getDate()} ${wEnd.toLocaleDateString("nl-NL", { month: "short" })}`
                    : `Week ${wMon.getDate()} ${wMon.toLocaleDateString("nl-NL", { month: "short" })} – ${wEnd.getDate()} ${wEnd.toLocaleDateString("nl-NL", { month: "short" })}`;
                  weeks.set(wKey, { key: wKey, label, sortKey: wMon.getTime(), rides: [] });
                }
                weeks.get(wKey)!.rides.push(r);
              }
              const sortedWeeks = Array.from(weeks.values()).sort((a, b) => a.sortKey - b.sortKey);

              // Group past rides by month (descending)
              type MonthGroup = { key: string; label: string; sortKey: number; rides: typeof filtered };
              const pastMonths = new Map<string, MonthGroup>();
              for (const r of pastRides) {
                const d = new Date(r.scheduled_at);
                const mKey = `${d.getFullYear()}-${d.getMonth()}`;
                if (!pastMonths.has(mKey)) {
                  pastMonths.set(mKey, {
                    key: mKey,
                    label: d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" }),
                    sortKey: d.getFullYear() * 12 + d.getMonth(),
                    rides: [],
                  });
                }
                pastMonths.get(mKey)!.rides.push(r);
              }
              const sortedPastMonths = Array.from(pastMonths.values()).sort((a, b) => b.sortKey - a.sortKey);

              const renderRideRow = (r: typeof filtered[number]) => {
                const ass = assignments[r.id] ?? [];
                const acceptedCount = ass.filter((a) => a.status === "accepted").length;
                return (
                  <TableRow
                    key={r.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/rit/${r.id}/bewerk`)}
                  >
                    <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">{displayRideNo(r)}</TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap py-2">{fmtCompact(r.scheduled_at)}</TableCell>
                    <TableCell className="text-xs py-2">
                      <span className="font-medium">{r.pickup_city}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="font-medium">{r.dropoff_city}</span>
                      {r.bundle_label && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold text-brass-deep bg-brass-gold/20 border border-brass-gold/40 px-1.5 py-0.5">📦 {r.bundle_label}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-center py-2">
                      {acceptedCount} / {r.num_escorts}
                    </TableCell>
                    <TableCell className="py-2"><TableStatusBadge status={r.status} /></TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Meer opties</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel className="text-xs">{displayRideNo(r)}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs" onClick={() => navigate(`/rit/${r.id}/bewerk`)}>
                            Aanpassen
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onClick={() => navigate(`/rit/${r.id}`)}>
                            Details bekijken
                          </DropdownMenuItem>
                          {r.bundle_id && (r.status === "open" || r.status === "matched") && (
                            <DropdownMenuItem className="text-xs" onClick={() => addRideToBundle(r)}>
                              + extra rit aan pakket
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              };

              const tableHeader = (
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Ritnummer</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Datum &amp; tijd</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Route</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold text-center">Begeleiders</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                    <TableHead className="h-9 w-[60px]" />
                  </TableRow>
                </TableHeader>
              );

              return (
                <>
                  <div className="border border-border rounded-md bg-card overflow-hidden">
                    <Table>
                      {tableHeader}
                      <TableBody>
                        {currentRides.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                              Geen ritten in {now.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}.
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedWeeks.flatMap((w) => [
                            <TableRow key={`whdr-${w.key}`} className="hover:bg-transparent border-b border-border/50 bg-muted/30">
                              <TableCell
                                colSpan={6}
                                className="text-xs font-semibold tracking-wider uppercase text-muted-foreground py-2 px-4"
                              >
                                {w.label} <span className="ml-1 normal-case tracking-normal font-normal tabular-nums">({w.rides.length} {w.rides.length === 1 ? "rit" : "ritten"})</span>
                              </TableCell>
                            </TableRow>,
                            ...[...w.rides]
                              .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                              .map((r) => renderRideRow(r)),
                          ])
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {sortedPastMonths.length > 0 && (
                    <div className="mt-12">
                      <h2 className="text-lg font-semibold text-muted-foreground mb-4">Eerdere ritten</h2>
                      <Accordion type="multiple" className="border border-border rounded-md bg-card overflow-hidden divide-y">
                        {sortedPastMonths.map((m) => (
                          <AccordionItem key={m.key} value={m.key} className="border-b-0">
                            <AccordionTrigger className="px-4 py-3 hover:bg-muted/40 hover:no-underline">
                              <span className="inline-flex items-center gap-2">
                                <span className="text-sm font-semibold text-foreground capitalize">{m.label}</span>
                                <span className="text-xs font-normal text-muted-foreground tabular-nums">({m.rides.length})</span>
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="p-0">
                              <Table>
                                {tableHeader}
                                <TableBody>
                                  {[...m.rides]
                                    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
                                    .map((r) => renderRideRow(r))}
                                </TableBody>
                              </Table>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
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
  const [overdueDismissed, setOverdueDismissed] = useState(false);
  const [escortSearch, setEscortSearch] = useState("");
  const [escortStatusFilter, setEscortStatusFilter] = useState<string>("all");
  

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
      .select("hourly_rate, hourly_rate_be, hourly_rate_de, hourly_rate_fr, hourly_rate_lu, km_rate_de, min_billable_hours")
      .eq("id", user.id)
      .maybeSingle();

    const rideMap = new Map((rides ?? []).map((r) => [r.id, r]));
    const merged = list
      .map((x) => {
        const ride = rideMap.get(x.ride_id) as RideRow | undefined;
        const blob = ride
          ? `${ride.pickup_city ?? ""} ${ride.dropoff_city ?? ""} ${ride.pickup_address ?? ""} ${ride.dropoff_address ?? ""}`
          : "";
        const isBe = /belgi|brussel|antwerp|gent|luik|liege|brugge|charleroi|namur|namen|leuven|mechelen|hasselt|kortrijk/i.test(blob);
        const isDe = /duitsland|germany|deutschland|köln|koeln|aachen|düsseldorf|dusseldorf|berlin|münchen|munchen|hamburg|frankfurt|stuttgart|dortmund|essen|bremen/i.test(blob);
        const isFr = /frankrijk|france|paris|lille|lyon|marseille|strasbourg|rijsel|nantes|bordeaux|toulouse|nice/i.test(blob);
        const isLu = /luxemburg|luxembourg/i.test(blob);
        const kmRateDe = (me as any)?.km_rate_de == null ? null : Number((me as any).km_rate_de);
        const deKmMode = isDe && kmRateDe != null && kmRateDe > 0;
        let rate = Number(me?.hourly_rate ?? 0);
        if (isLu) rate = Number((me as any)?.hourly_rate_lu ?? me?.hourly_rate ?? 0);
        else if (isFr) rate = Number((me as any)?.hourly_rate_fr ?? me?.hourly_rate ?? 0);
        else if (isDe) rate = deKmMode ? Number(kmRateDe) : Number((me as any)?.hourly_rate_de ?? me?.hourly_rate ?? 0);
        else if (isBe) rate = Number((me as any)?.hourly_rate_be ?? me?.hourly_rate ?? 0);
        return {
          ...x,
          ride: ride as RideRow,
          hourly_rate: rate,
          is_be_ride: isBe,
          is_de_ride: isDe,
          is_fr_ride: isFr,
          is_lu_ride: isLu,
          de_km_mode: deKmMode,
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
      const { error } = await supabase.rpc("express_ride_interest", { _assignment_id: id });
      if (error) return toast.error(error.message);
      toast.success("Beschikbaar gemeld — selectie binnen 5 min.");
    } else {
      const { error } = await supabase
        .from("ride_assignments")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return toast.error(error.message);
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

    // Bij gecombineerde ritten (bundle): reistijd heen telt alleen mee bij de eerste rit
    // en reistijd terug alleen bij de laatste. Tussenliggende ritten worden naadloos
    // gekoppeld zodat de begeleider niet dubbel wordt uitbetaald voor reistijd.
    const bundleId = item.ride?.bundle_id ?? null;
    const bundleSiblings = bundleId
      ? items
          .filter((x) => x.ride?.bundle_id === bundleId)
          .sort((a, b) => new Date(a.ride.scheduled_at).getTime() - new Date(b.ride.scheduled_at).getTime())
      : [item];
    const isFirstInBundle = bundleSiblings[0]?.id === item.id;
    const isLastInBundle = bundleSiblings[bundleSiblings.length - 1]?.id === item.id;

    const travelTo = isFirstInBundle ? ceilQuarter(item.travel_to_pickup_min) : 0;
    const travelBack = isLastInBundle ? ceilQuarter(item.travel_back_home_min) : 0;
    // Vertrek standplaats = starttijd rit − reistijd heen
    // Terug standplaats = eindtijd rit + reistijd terug
    const start = new Date(rideStart.getTime() - travelTo * 60_000);
    const end = new Date(rideEnd.getTime() + travelBack * 60_000);

    const rawHours = +((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2);
    // Minimum-uurtarief geldt NIET bij gecombineerde ritten (bundle): de totale duur
    // van de gekoppelde ritten is leidend.
    const applyMin = !bundleId;
    const billableHours = applyMin ? Math.max(rawHours, item.min_billable_hours || 0) : rawHours;
    const hours = +billableHours.toFixed(2);
    let baseCost = +(hours * item.hourly_rate).toFixed(2);
    // Duitsland km-modus: kosten = afstand × km-tarief (uurtarief & brandstoftoeslag vervallen voor DE)
    if ((item as any).de_km_mode && (item.ride as any)?.pickup_lat != null && (item.ride as any)?.dropoff_lat != null) {
      const km = distanceKm(
        { lat: (item.ride as any).pickup_lat, lng: (item.ride as any).pickup_lng },
        { lat: (item.ride as any).dropoff_lat, lng: (item.ride as any).dropoff_lng },
      );
      baseCost = +(km * Number(item.hourly_rate)).toFixed(2);
    }

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

    const nowIso = new Date().toISOString();
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
        hours_submitted_at: nowIso,
        // Planner (escort) vult zelf de uren in → automatisch goedgekeurd.
        // Alleen wanneer een aparte chauffeur de uren indient (DriverDashboard) blijft goedkeuring nodig.
        hours_approved_at: nowIso,
        hours_approved_by: user.id,
        hours_dispute_status: "none",
        hours_dispute_reason: null,
      } as never)
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

    toast.success(t("dash.hoursRegistered"));
    setOpenId(null);
    load();
  };

  const overdueItems = items.filter(
    (i) =>
      i.status === "accepted" &&
      !i.hours_submitted_at &&
      Date.now() - new Date(i.ride.scheduled_at).getTime() > 8 * 3600 * 1000,
  );

  return (
    <div className="space-y-12">
      <Dialog
        open={overdueItems.length > 0 && !overdueDismissed && openId === null}
        onOpenChange={(o) => { if (!o) setOverdueDismissed(true); }}
      >
        <DialogContent className="max-w-lg w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display italic text-2xl text-brass-deep">
              ⚠ Vul je gewerkte uren in
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-brass-deep/70">
            Je hebt voor {overdueItems.length === 1 ? "deze rit" : `${overdueItems.length} ritten`} nog geen uren ingevuld terwijl de geplande starttijd meer dan 8 uur geleden is. Vul ze direct in zodat de opdrachtgever de rit kan afronden en de factuur kan worden opgemaakt.
          </p>
          <ul className="divide-y divide-brass-deep/10 border border-brass-deep/15 mt-2">
            {overdueItems.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {a.ride.pickup_city} <span className="text-brass-gold">→</span> {a.ride.dropoff_city}
                  </p>
                  <p className="text-xs text-brass-deep/80 tabular-nums">
                    {new Date(a.ride.scheduled_at).toLocaleString(localeFromI18n(i18n.language), { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setOverdueDismissed(true); setOpenId(a.id); }}
                  className="px-3 py-2 bg-brass-deep text-parchment text-[10px] uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                >
                  Vul nu in
                </button>
              </li>
            ))}
          </ul>
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setOverdueDismissed(true)}
              className="text-xs uppercase tracking-widest text-brass-deep/80 hover:text-brass-deep font-semibold"
            >
              Later
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("dash.myAssignments")}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to="/profiel">{t("dash.myProfile")}</Link>
        </Button>
      </header>

      {user && <GoogleAgendaStatus />}
      {user && <CurrentLocationCard />}
      {user && <ScheduledLocationsCard />}

      {loading ? (
        <p className="text-sm text-brass-deep/80">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/80">{t("dash.noAssignmentsYet")}</p>
        </div>
      ) : (() => {
        const isExpired = (a: typeof items[number]) =>
          a.status === "invited" && new Date(a.responds_by).getTime() <= Date.now();
        const effectiveStatus = (a: typeof items[number]) => isExpired(a) ? "expired" : a.status;

        const q = escortSearch.trim().toLowerCase();
        const filtered = items.filter((a) => {
          const es = effectiveStatus(a);
          if (escortStatusFilter !== "all" && es !== escortStatusFilter) return false;
          if (!q) return true;
          return (
            (a.ride.ride_number ?? "").toLowerCase().includes(q) ||
            a.ride.pickup_city.toLowerCase().includes(q) ||
            a.ride.dropoff_city.toLowerCase().includes(q) ||
            (counterpartyNames[a.id] ?? a.client_anon).toLowerCase().includes(q)
          );
        });

        const openItem = items.find((x) => x.id === openId) ?? null;

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={escortStatusFilter} onValueChange={setEscortStatusFilter}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="invited">Uitgenodigd</SelectItem>
                  <SelectItem value="accepted">Geaccepteerd</SelectItem>
                  <SelectItem value="declined">Geweigerd</SelectItem>
                  <SelectItem value="expired">Verlopen</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="search"
                value={escortSearch}
                onChange={(e) => setEscortSearch(e.target.value)}
                placeholder="Zoek op ritnummer, opdrachtgever of stad…"
                className="flex-1 min-w-[220px] h-9"
              />
            </div>

            <div className="border border-border rounded-md bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Ritnummer</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Datum &amp; tijd</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Route</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Opdrachtgever</TableHead>
                    <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                    <TableHead className="h-9 w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Geen opdrachten gevonden.</TableCell></TableRow>
                  ) : filtered.map((a) => {
                    const disputed = (a as any).hours_dispute_status === "disputed";
                    const submitted = !!a.hours_submitted_at && !disputed;
                    const isInvited = a.status === "invited";
                    const expired = isExpired(a);
                    const accepted = a.status === "accepted";
                    const clickable = accepted || (isInvited && !expired);
                    const opdr = counterpartyNames[a.id] ?? a.client_anon;
                    return (
                      <TableRow
                        key={a.id}
                        className={`hover:bg-muted/30 ${clickable ? "cursor-pointer" : ""} ${isInvited && !expired ? "bg-amber-50/50" : ""}`}
                        onClick={clickable ? () => navigate(`/opdracht/${a.ride.id}`) : undefined}
                      >
                        <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">{displayRideNo(a.ride)}</TableCell>
                        <TableCell className="text-xs tabular-nums whitespace-nowrap py-2">{fmtCompact(a.ride.scheduled_at)}</TableCell>
                        <TableCell className="text-xs py-2">
                          <span className="font-medium">{a.ride.pickup_city}</span>
                          <span className="text-muted-foreground mx-1.5">→</span>
                          <span className="font-medium">{a.ride.dropoff_city}</span>
                        </TableCell>
                        <TableCell className="text-xs py-2 max-w-[180px] truncate">{opdr}</TableCell>
                        <TableCell className="py-2"><TableStatusBadge status={expired ? "expired" : a.status} /></TableCell>
                        <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Meer opties</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">{displayRideNo(a.ride)}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {clickable && (
                                <DropdownMenuItem className="text-xs" onClick={() => navigate(`/opdracht/${a.ride.id}`)}>
                                  Opdracht bekijken
                                </DropdownMenuItem>
                              )}
                              {isInvited && !expired && (
                                <>
                                  <DropdownMenuItem className="text-xs" onClick={() => respond(a.id, true)}>
                                    Ik ben beschikbaar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs" onClick={() => respond(a.id, false)}>
                                    Weiger
                                  </DropdownMenuItem>
                                </>
                              )}
                              {accepted && !submitted && (
                                <DropdownMenuItem className="text-xs" onClick={() => setOpenId(a.id)}>
                                  Uren invullen
                                </DropdownMenuItem>
                              )}
                              {disputed && (
                                <DropdownMenuItem className="text-xs" onClick={() => setOpenId(a.id)}>
                                  Uren aanpassen
                                </DropdownMenuItem>
                              )}
                              {submitted && (
                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                  ✓ {a.actual_hours}u · €{Number(a.actual_cost).toFixed(2)}
                                </DropdownMenuLabel>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Uren invullen dialog */}
            {openItem && (
              <Dialog open={!!openId} onOpenChange={(o) => { if (!o) setOpenId(null); }}>
                <DialogContent className="max-w-2xl w-[calc(100vw-1rem)] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="font-display italic text-2xl text-brass-deep">{t("dash.fillHours")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => submitHours(openItem.id, e)} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="md:col-span-2 bg-parchment/60 border border-brass-deep/10 px-4 py-3 text-xs text-brass-deep/70 space-y-1">
                      <div><strong>{t("dash.plannedTime")}</strong> {new Date(openItem.ride.scheduled_at).toLocaleString(localeFromI18n(i18n.language), { dateStyle: "short", timeStyle: "short" })}</div>
                      <div><strong>{t("dash.travelFromBase")}</strong> {fmtHours(openItem.travel_to_pickup_min)} · <strong>{t("dash.back")}</strong> {fmtHours(openItem.travel_back_home_min)} {t("dash.roundedQuarter")}</div>
                    </div>
                    {(() => {
                      const sched = new Date(openItem.ride.scheduled_at);
                      const pad = (n: number) => String(n).padStart(2, "0");
                      const defDate = `${sched.getFullYear()}-${pad(sched.getMonth() + 1)}-${pad(sched.getDate())}`;
                      const roundedMin = Math.round(sched.getMinutes() / 15) * 15;
                      const rh = roundedMin === 60 ? sched.getHours() + 1 : sched.getHours();
                      const rm = roundedMin === 60 ? 0 : roundedMin;
                      const defTime = `${pad(rh % 24)}:${pad(rm)}`;
                      return (
                        <>
                          <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{t("dash.rideStartTime")}</div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-semibold">{t("dash.date")}</label>
                            <input name="ride_start_date" type="date" defaultValue={defDate} required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-semibold">{t("dash.time")}</label>
                            <input type="time" step={900} name="ride_start_time" defaultValue={defTime} required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
                          </div>
                          <div className="md:col-span-2 text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mt-2">{t("dash.rideEndTime")}</div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-semibold">{t("dash.date")}</label>
                            <input name="ride_end_date" type="date" defaultValue={defDate} required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-semibold">{t("dash.time")}</label>
                            <input type="time" step={900} name="ride_end_time" defaultValue="" required className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
                          </div>
                        </>
                      );
                    })()}
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{t("dash.notes")}</label>
                      <textarea name="hours_notes" rows={2} className="mt-1 w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold" />
                    </div>
                    <div className="md:col-span-2 pt-2 border-t border-brass-deep/10">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{t("dash.extraCosts")}</label>
                        <button type="button" onClick={() => addExtra(openItem.id)} className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold">{t("dash.addRow")}</button>
                      </div>
                      {getExtras(openItem.id).length === 0 ? (
                        <p className="text-xs text-brass-deep/80">{t("dash.extraCostsHint")}</p>
                      ) : (
                        <ul className="space-y-2">
                          {getExtras(openItem.id).map((ec, idx) => (
                            <li key={idx} className="grid grid-cols-12 gap-2 items-center">
                              <input type="text" value={ec.description} onChange={(e) => updateExtra(openItem.id, idx, { description: e.target.value })} placeholder={t("dash.extraCostsDescPlaceholder")} maxLength={120} className="col-span-7 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold" />
                              <div className="col-span-4 relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brass-deep/80 text-sm">€</span>
                                <input type="number" inputMode="decimal" step="0.01" min="0" value={ec.amount === 0 ? "" : ec.amount} onChange={(e) => updateExtra(openItem.id, idx, { amount: e.target.value === "" ? 0 : Number(e.target.value) })} placeholder="0,00" className="w-full bg-parchment border border-brass-deep/15 pl-7 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:border-brass-gold" />
                              </div>
                              <button type="button" onClick={() => removeExtra(openItem.id, idx)} aria-label={t("dash.removeRow")} className="col-span-1 text-brass-deep/80 hover:text-red-700 text-lg leading-none">×</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {getExtras(openItem.id).length > 0 && (
                        <p className="text-xs text-brass-deep/80 mt-2 tabular-nums text-right">{t("dash.extraCostsSubtotal", { amount: getExtras(openItem.id).reduce((s, e) => s + (Number(e.amount) || 0), 0).toFixed(2) })}</p>
                      )}
                    </div>
                    <p className="md:col-span-2 text-xs text-brass-deep/80">{t("dash.rateInfo", { country: openItem.is_be_ride ? t("common.countryBE") : t("common.countryNL"), rate: openItem.hourly_rate, cross: openItem.is_be_ride ? t("dash.rateCrossBorder") : "", minHours: openItem.min_billable_hours > 0 ? t("dash.minBillable", { h: openItem.min_billable_hours }) : "" })}</p>
                    <button className="md:col-span-2 px-6 py-3 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors">{t("dash.submit")}</button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        );
      })()}

    </div>
  );
};

const DashboardInner = () => {
  const { t } = useTranslation();
  const { role, loading } = useAuth();
  const { isDriver, loading: companyLoading } = useCompany();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead title="Dashboard | ViaCust" description="Bekijk en beheer je transportritten, planningen en opdrachten in ViaCust." />
      <Nav />
      <main className="px-6 md:px-8 py-6 md:py-8 min-h-[calc(100vh-5rem)]">
        <div className="max-w-7xl mx-auto">
          {!isDriver && <InstallAppBanner />}
          {!isDriver && <OnboardingChecklist />}
          {loading || companyLoading ? (
            <p className="text-sm text-brass-deep/80">{t("common.loading")}</p>
          ) : role === "begeleider" ? (
            isDriver ? <DriverDashboard /> : <EscortDashboard />
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
