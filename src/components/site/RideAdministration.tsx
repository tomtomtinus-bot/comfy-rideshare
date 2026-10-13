import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, FileText, Plus, Route, Sun, ClipboardCheck, X, Search, ChevronLeft, ChevronRight, MoreHorizontal, Paperclip, Copy, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CrewEditor, ConflictBanner, useConflicts, ESCORT_ROLES, type CrewMember } from "@/components/site/RideCrew";
import { RideDocuments, uploadRideDocs, deleteRideDocs } from "@/components/site/RideDocuments";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BreakdownView, type Breakdown } from "@/components/site/TicketBreakdown";

type Bucket = "week" | "afgerond";
type TicketStatus = "none" | "submitted" | "approved" | "rejected";

interface Row {
  rideId: string;
  clientId: string;
  raw: any;
  rideNumber: string;
  reference: string | null;
  permit: string | null;
  pickup: string;
  dropoff: string;
  scheduledAt: string;
  rideStatus: string;
  plates: string[];
  dims: string | null;
  rateType: string | null;
  rateAmount: number | null;
  assignmentId: string | null;
  counterparty: string;
  hours: number | null;
  km: number | null;
  waiting: number | null;
  expenses: number | null;
  expensesNote: string | null;
  notes: string | null;
  cost: number | null;
  ticketStatus: TicketStatus;
  rejectReason: string | null;
  invoicedAt: string | null;
  breakdown: Breakdown | null;
}

interface Option { id: string; label: string }

const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);
const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const rateLabel = (t: string | null, a: number | null) =>
  a == null ? "—" : t === "km" ? `${eur(a)}/km` : t === "fixed" ? `${eur(a)} vast` : `${eur(a)}/uur`;

const mondayOf = (offset: number) => {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
};
const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const todayIdx = () => (new Date().getDay() + 6) % 7;

const bucketOf = (r: Row): Bucket => {
  if (r.rideStatus === "completed" || r.ticketStatus !== "none") return "afgerond";
  return "week";
};

const cityOf = (formatted: string, fallback: string) => {
  const parts = formatted.split(",").map((s) => s.trim());
  const cand = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return (cand || fallback).replace(/^\d{4}\s?[A-Z]{0,2}\s*/, "") || fallback;
};

const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

const TicketBadge = ({ r }: { r: Row }) => {
  if (r.invoicedAt) return <Badge variant="secondary">Gefactureerd</Badge>;
  if (r.ticketStatus === "approved") return <Badge className="border-transparent bg-success-soft text-success hover:bg-success-soft font-medium">Goedgekeurd</Badge>;
  if (r.ticketStatus === "submitted") return <Badge className="border-transparent bg-warning text-primary-foreground hover:bg-warning font-semibold">Ter controle</Badge>;
  if (r.ticketStatus === "rejected") return <Badge variant="destructive">Afgekeurd</Badge>;
  return <span className="text-xs text-muted-foreground">Nog geen ritbon</span>;
};

export const RideAdministration = () => {
  const { user, role } = useAuth();
  const isEscort = role === "begeleider";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Option[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [ticketRow, setTicketRow] = useState<Row | null>(null);
  const [reviewRow, setReviewRow] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cpFilter, setCpFilter] = useState("all");
  const [ticketFilter, setTicketFilter] = useState("all");
  const [tab, setTab] = useState<Bucket>("week");
  const [dayWeek, setDayWeek] = useState(0);
  const [day, setDay] = useState<number | null>(todayIdx());
  const [allWeeks, setAllWeeks] = useState(false);
  const [docsRow, setDocsRow] = useState<Row | null>(null);
  const [addRow, setAddRow] = useState<Row | null>(null);
  const [dupFrom, setDupFrom] = useState<ReturnType<typeof rideToForm> | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rel } = await supabase.rpc("list_relations");
      const accepted = (rel ?? []).filter((r: any) => r.status === "accepted");
      const names = new Map<string, string>(accepted.map((r: any) => [r.other_id, r.name]));
      setOptions(accepted.map((r: any) => ({ id: r.other_id, label: r.name })));

      const toRow = (r: any, a: any, counterparty: string): Row => ({
        rideId: r.id, clientId: r.client_id, raw: r, rideNumber: r.ride_number, reference: r.client_reference, permit: r.permit_number,
        pickup: r.pickup_city, dropoff: r.dropoff_city, scheduledAt: r.scheduled_at, rideStatus: r.status,
        plates: r.license_plates ?? [],
        dims: [r.cargo_length_m, r.cargo_width_m, r.cargo_height_m].some((x: any) => x != null)
          ? `${r.cargo_length_m ?? "?"} × ${r.cargo_width_m ?? "?"} × ${r.cargo_height_m ?? "?"} m` : null,
        rateType: r.rate_type, rateAmount: r.rate_amount,
        assignmentId: a?.id ?? null, counterparty,
        hours: a?.actual_hours ?? null, km: a?.ticket_km ?? null, waiting: a?.ticket_waiting_hours ?? null,
        expenses: a?.ticket_expenses ?? null, expensesNote: a?.ticket_expenses_note ?? null, notes: a?.hours_notes ?? null,
        cost: a?.actual_cost ?? null, ticketStatus: (a?.ticket_status ?? "none") as TicketStatus,
        rejectReason: a?.ticket_reject_reason ?? null, invoicedAt: a?.invoiced_at ?? null,
        breakdown: (a?.ticket_breakdown ?? null) as Breakdown | null,
      });

      if (isEscort) {
        const { data: as } = await supabase.from("ride_assignments").select("*").eq("escort_id", user.id).eq("status", "accepted");
        const ids = (as ?? []).map((a) => a.ride_id);
        const { data: rides } = ids.length ? await supabase.from("rides").select("*").in("id", ids) : { data: [] as any[] };
        const rm = new Map((rides ?? []).map((r: any) => [r.id, r]));
        setRows((as ?? []).flatMap((a) => {
          const r: any = rm.get(a.ride_id);
          if (!r || r.status === "cancelled") return [];
          return [toRow(r, a, (names.get(r.client_id) ?? "Planner") + (a.escort_role ? ` · ${a.escort_role.split(" ")[0]}` : ""))];
        }));
      } else {
        const { data: rides } = await supabase.from("rides").select("*, ride_assignments(*)").eq("client_id", user.id).neq("status", "cancelled");
        setRows((rides ?? []).flatMap((r: any) => {
          const as = (r.ride_assignments ?? []).filter((x: any) => x.status === "accepted")
            .sort((x: any, y: any) => String(x.escort_role ?? "").localeCompare(String(y.escort_role ?? "")));
          if (!as.length) return [toRow(r, null, "Nog niet toegewezen")];
          return as.map((a: any) => toRow(r, a, (names.get(a.escort_id) ?? "Begeleider") + (a.escort_role ? ` (${a.escort_role.split(" ")[0]})` : "")));
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [user, isEscort]);

  useEffect(() => { load(); }, [load]);

  // Realtime: RLS-filtered stream; reload when assignments or own rides change.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`ride-admin-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_assignments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);


  const counterparties = useMemo(() => [...new Set(rows.map((r) => r.counterparty))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cpFilter !== "all" && r.counterparty !== cpFilter) return false;
      if (ticketFilter !== "all" && r.ticketStatus !== ticketFilter) return false;
      if (needle) {
        const hay = [r.rideNumber, r.permit, r.reference, r.pickup, r.dropoff, `${r.pickup} ${r.dropoff}`, r.counterparty, ...r.plates].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, cpFilter, ticketFilter]);

  const dayWeekStart = useMemo(() => mondayOf(dayWeek), [dayWeek]);
  const weekAll = useMemo(() => {
    const end = new Date(dayWeekStart); end.setDate(end.getDate() + 7);
    return filtered.filter((r) => {
      const d = new Date(r.scheduledAt);
      return d >= dayWeekStart && d < end;
    });
  }, [filtered, dayWeekStart]);
  const activeRows = allWeeks ? filtered : weekAll;
  const weekRows = useMemo(() => activeRows.filter((r) => bucketOf(r) === "week").sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)), [activeRows]);
  const doneRows = useMemo(() => activeRows.filter((r) => bucketOf(r) === "afgerond").sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt)), [activeRows]);
  const allCounts = useMemo(() => ({
    week: filtered.filter((r) => bucketOf(r) === "week").length,
    afgerond: filtered.filter((r) => bucketOf(r) === "afgerond").length,
  }), [filtered]);
  const dayIdxOf = (r: Row) => (new Date(r.scheduledAt).getDay() + 6) % 7;
  const activeWeekRows = tab === "afgerond" ? doneRows : weekRows;
  const dayCounts = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0, 0];
    activeWeekRows.forEach((r) => c[dayIdxOf(r)]++);
    return c;
  }, [activeWeekRows]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, Row[]> = { week: [], afgerond: [] };
    if (allWeeks) {
      g.week = weekRows;
      g.afgerond = doneRows;
    } else {
      g.week = day == null ? weekRows : weekRows.filter((r) => dayIdxOf(r) === day);
      g.afgerond = day == null ? doneRows : doneRows.filter((r) => dayIdxOf(r) === day);
    }
    return g;
  }, [weekRows, doneRows, day, allWeeks]);

  const shiftDayWeek = (n: number) => {
    const next = dayWeek + n;
    setDayWeek(next);
    setDay(next === 0 ? todayIdx() : null);
  };

  const toggleAllWeeks = () => {
    setAllWeeks((v) => !v);
    setDay(null);
  };

  const toReview = rows.filter((r) => r.ticketStatus === "submitted").length;
  const byAssignment = useMemo(() => new Map(rows.filter((r) => r.assignmentId).map((r) => [r.assignmentId!, r])), [rows]);
  const selectedRows = [...selected].map((id) => byAssignment.get(id)).filter(Boolean) as Row[];
  const approvable = selectedRows.filter((r) => r.ticketStatus === "submitted");
  const invoiceable = selectedRows.filter((r) => r.ticketStatus === "approved" && !r.invoicedAt);

  const approveSelected = async () => {
    let ok = 0;
    for (const r of approvable) {
      const { error } = await supabase.rpc("review_ride_ticket", { _assignment_id: r.assignmentId!, _approve: true, _reason: "" });
      if (error) toast.error(`${r.rideNumber}: ${error.message}`); else ok++;
    }
    if (ok) toast.success(`${ok} ritbon(nen) goedgekeurd`);
    setSelected(new Set());
    load();
  };

  const invoiceSelected = async () => {
    const { data, error } = await supabase.rpc("invoice_selected_tickets", { _assignment_ids: invoiceable.map((r) => r.assignmentId!) });
    if (error) return toast.error(error.message);
    toast.success(`${data} factuur/facturen aangemaakt — de PDF staat zo klaar onder Facturen`);
    setSelected(new Set());
    load();
  };

  const complete = async (r: Row) => {
    if (isEscort) return setTicketRow(r);
    const { error } = await supabase.rpc("mark_ride_completed", { _ride_id: r.rideId });
    if (error) return toast.error(error.message);
    toast.success("Rit afgerond — de begeleider vult nu de ritbon in");
    load();
  };

  const detailHref = (r: Row) => (isEscort ? `/opdracht/${r.rideId}` : `/rit/${r.rideId}`);

  const toggle = (ids: string[], on: boolean) => {
    const n = new Set(selected);
    ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
    setSelected(n);
  };

  const renderTable = (bucket: Bucket) => {
    const list = grouped[bucket];
    if (!list.length) return <p className="text-sm text-muted-foreground py-10 text-center">Geen ritten.</p>;
    const done = bucket === "afgerond";
    const ids = list.flatMap((r) => (r.assignmentId ? [r.assignmentId] : []));
    const all = ids.length > 0 && ids.every((id) => selected.has(id));
    const c = "py-1.5 px-2";
    return (
      <div className="overflow-x-auto">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="w-8 px-2 h-8">
                <Checkbox checked={all} onCheckedChange={(v) => toggle(ids, !!v)} aria-label="Alles selecteren" />
              </TableHead>
              <TableHead className="px-2 h-8">Rit / dossier</TableHead>
              <TableHead className="px-2 h-8">Traject</TableHead>
              <TableHead className="px-2 h-8">Datum/tijd</TableHead>
              <TableHead className="px-2 h-8">Lading / kenteken</TableHead>
              <TableHead className="px-2 h-8">Tarief</TableHead>
              <TableHead className="px-2 h-8">{isEscort ? "Planner" : "Begeleider"}</TableHead>
              {done && <TableHead className="px-2 h-8">Ritbon</TableHead>}
              <TableHead className="px-2 h-8 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((r) => (
              <TableRow key={r.assignmentId ?? r.rideId} data-state={r.assignmentId && selected.has(r.assignmentId) ? "selected" : undefined}>
                <TableCell className={c}>
                  {r.assignmentId && (
                    <Checkbox checked={selected.has(r.assignmentId)} onCheckedChange={(v) => toggle([r.assignmentId!], !!v)} aria-label={`Selecteer ${r.rideNumber}`} />
                  )}
                </TableCell>
                <TableCell className={`${c} whitespace-nowrap`}>
                  <Link to={detailHref(r)} className="font-medium hover:underline">{r.rideNumber}</Link>
                  {(r.permit || r.reference) && <span className="ml-2 text-xs text-muted-foreground">{[r.permit, r.reference].filter(Boolean).join(" · ")}</span>}
                </TableCell>
                <TableCell className={`${c} whitespace-nowrap`}>{r.pickup} → {r.dropoff}</TableCell>
                <TableCell className={`${c} whitespace-nowrap`}>{fmt(r.scheduledAt)}</TableCell>
                <TableCell className={`${c} whitespace-nowrap text-xs`}>
                  {r.dims ?? "—"}{r.plates.length > 0 && <span className="ml-2 text-muted-foreground">{r.plates.join(", ")}</span>}
                </TableCell>
                <TableCell className={`${c} whitespace-nowrap text-xs`}>{rateLabel(r.rateType, r.rateAmount)}</TableCell>
                <TableCell className={`${c} whitespace-nowrap`}>{r.counterparty}</TableCell>
                {done && (
                  <TableCell className={`${c} whitespace-nowrap`}>
                    <TicketBadge r={r} />
                    {r.ticketStatus !== "none" && r.cost != null && <span className="ml-2 text-xs text-muted-foreground">{eur(Number(r.cost))}</span>}
                  </TableCell>
                )}
                <TableCell className={`${c} text-right whitespace-nowrap`}>
                  {!done && r.assignmentId && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => complete(r)}>
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Afronden
                    </Button>
                  )}
                  {done && isEscort && r.assignmentId && !r.invoicedAt && (
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setTicketRow(r)}>
                      <FileText className="h-3.5 w-3.5 mr-1" />{r.ticketStatus === "none" ? "Ritbon invullen" : "Wijzigen"}
                    </Button>
                  )}
                  {done && !isEscort && r.ticketStatus === "submitted" && (
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={() => setReviewRow(r)}>
                      <ClipboardCheck className="h-3.5 w-3.5 mr-1" />Controleren
                    </Button>
                  )}
                  {done && !isEscort && (r.ticketStatus === "approved" || r.ticketStatus === "rejected") && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setReviewRow(r)}>Bekijken</Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-1" aria-label="Meer acties"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDocsRow(r)}><Paperclip className="h-4 w-4 mr-2" />Documenten</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setDupFrom(rideToForm(r.raw)); setNewOpen(true); }}><Copy className="h-4 w-4 mr-2" />Dupliceer rit</DropdownMenuItem>
                      {!isEscort && <DropdownMenuItem onClick={() => setAddRow(r)}><UserPlus className="h-4 w-4 mr-2" />Begeleider toevoegen</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rittenoverzicht</h1>
          <p className="text-sm text-slate-500">
            {isEscort ? "Je ritten met vaste planners, ritbonnen en facturatie." : "Plan ritten met je vaste begeleiders en keur ritbonnen goed."}
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Nieuwe rit toevoegen</Button>
      </div>

      <Card className="p-3">
        <Tabs value={tab} onValueChange={(v) => { const b = v as Bucket; setTab(b); setDay(b === "week" && dayWeek === 0 ? todayIdx() : null); }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="week"><Sun className="h-4 w-4 mr-1" />Deze week ({weekRows.length})</TabsTrigger>
              <TabsTrigger value="afgerond">
                <CheckCircle2 className="h-4 w-4 mr-1" />Afgerond ({grouped.afgerond.length})
                {!isEscort && toReview > 0 && <Badge className="ml-2 h-5 px-1.5">{toReview}</Badge>}
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {selected.size > 0 && <span className="text-xs text-muted-foreground">{selected.size} geselecteerd</span>}
              {!isEscort && approvable.length > 0 && (
                <Button size="sm" className="h-8" onClick={approveSelected}><CheckCircle2 className="h-4 w-4 mr-1" />Geselecteerde goedkeuren ({approvable.length})</Button>
              )}
              {isEscort && invoiceable.length > 0 && (
                <Button size="sm" className="h-8" onClick={invoiceSelected}><FileText className="h-4 w-4 mr-1" />Bundel tot factuur ({invoiceable.length})</Button>
              )}
              {selected.size > 0 && <Button size="sm" variant="ghost" className="h-8" onClick={() => setSelected(new Set())}><X className="h-4 w-4" /></Button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2 rounded-lg border bg-muted/40 p-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Zoek dossier, referentie, traject, kenteken, ${isEscort ? "planner" : "begeleider"}…`} className="h-8 pl-8 text-sm" />
            </div>
            <Select value={cpFilter} onValueChange={setCpFilter}>
              <SelectTrigger className="h-8 w-[170px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEscort ? "Alle planners" : "Alle begeleiders"}</SelectItem>
                {counterparties.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ticketFilter} onValueChange={(v) => {
              setTicketFilter(v);
              if (v === "approved" || v === "rejected") { setAllWeeks(true); setDay(null); }
            }}>
              <SelectTrigger className="h-8 w-[160px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ritbon: alles</SelectItem>
                <SelectItem value="approved">Goedgekeurd</SelectItem>
                <SelectItem value="rejected">Afgekeurd</SelectItem>
                <SelectItem value="none">Nog geen ritbon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? <p className="text-sm text-slate-500 py-10 text-center">Laden…</p> : (
            <>
              <div className="flex flex-wrap items-center gap-1 mb-2">
                {!allWeeks ? (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => shiftDayWeek(-1)}><ChevronLeft className="h-3.5 w-3.5 mr-0.5" />Vorige week</Button>
                    <button onClick={() => setDay(null)} className={cn("h-7 px-3 rounded-full text-xs font-medium border transition-colors", day == null ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}>Hele week ({activeWeekRows.length})</button>
                    {DAY_LABELS.map((l, i) => {
                      const d = new Date(dayWeekStart); d.setDate(d.getDate() + i);
                      const isToday = dayWeek === 0 && i === todayIdx();
                      return (
                        <button key={l} onClick={() => setDay(i)}
                          className={cn("h-7 px-3 rounded-full text-xs font-medium border transition-colors tabular-nums", day === i ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted", dayCounts[i] === 0 && day !== i && "text-muted-foreground", isToday && day !== i && "border-primary/50")}>
                          {l} {d.getDate()}-{d.getMonth() + 1} ({dayCounts[i]})
                        </button>
                      );
                    })}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => shiftDayWeek(1)}>Volgende week<ChevronRight className="h-3.5 w-3.5 ml-0.5" /></Button>
                    {dayWeek !== 0 && <Button size="sm" variant="link" className="h-7 px-1 text-xs" onClick={() => shiftDayWeek(-dayWeek)}>Naar deze week</Button>}
                  </>
                ) : null}
                <button onClick={toggleAllWeeks} className={cn("h-7 px-3 rounded-full text-xs font-medium border transition-colors", allWeeks ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted")}>
                  Alle weken ({tab === "afgerond" ? allCounts.afgerond : allCounts.week})
                </button>
                {allWeeks && <Button size="sm" variant="link" className="h-7 px-1 text-xs" onClick={toggleAllWeeks}>Terug naar weekweergave</Button>}
              </div>
              <TabsContent value="week">{renderTable("week")}</TabsContent>
              <TabsContent value="afgerond">{renderTable("afgerond")}</TabsContent>
            </>
          )}
        </Tabs>
      </Card>

      <NewRideDialog open={newOpen} onOpenChange={(v) => { setNewOpen(v); if (!v) setDupFrom(null); }} isEscort={isEscort} options={options} onCreated={load} initial={dupFrom} />
      <TicketDialog row={ticketRow} onClose={() => setTicketRow(null)} onSaved={load} />
      <ReviewDialog row={reviewRow} onClose={() => setReviewRow(null)} onSaved={load} />
      <AddEscortDialog row={addRow} options={options} onClose={() => setAddRow(null)} onSaved={load} />
      <Sheet open={!!docsRow} onOpenChange={(v) => !v && setDocsRow(null)}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>Documenten — {docsRow?.rideNumber}</SheetTitle></SheetHeader>
          <p className="text-sm text-muted-foreground mb-3">{docsRow?.pickup} → {docsRow?.dropoff}</p>
          {docsRow && <RideDocuments clientId={docsRow.clientId} rideId={docsRow.rideId} canDelete={!isEscort} />}
        </SheetContent>
      </Sheet>
    </div>
  );
};

const emptyRide = {
  pickup: "", dropoff: "", date: "", time: "08:00", permit: "", reference: "", notes: "",
  length: "", width: "", height: "", weight: "", plates: "", rateType: "hourly", rate: "", party: "none",
};

export const rideToForm = (r: any): typeof emptyRide => {
  const s = (x: any) => (x == null ? "" : String(x));
  return {
    ...emptyRide,
    pickup: r.pickup_address ?? "", dropoff: r.dropoff_address ?? "",
    permit: s(r.permit_number), reference: s(r.client_reference), notes: s(r.notes),
    length: s(r.cargo_length_m), width: s(r.cargo_width_m), height: s(r.cargo_height_m), weight: s(r.cargo_weight_t),
    plates: (r.license_plates ?? []).join(", "), rateType: r.rate_type ?? "hourly", rate: s(r.rate_amount),
  };
};

const NewRideDialog = ({ open, onOpenChange, isEscort, options, onCreated, initial }: {
  open: boolean; onOpenChange: (v: boolean) => void; isEscort: boolean; options: Option[]; onCreated: () => void; initial?: typeof emptyRide | null;
}) => {
  const [f, setF] = useState(emptyRide);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [crew, setCrew] = useState<CrewMember[]>([{ id: "none", role: ESCORT_ROLES[0] }]);
  const { user: me } = useAuth();
  useEffect(() => { if (open) { setF(initial ?? emptyRide); setFiles([]); setCrew([{ id: "none", role: ESCORT_ROLES[0] }]); } }, [open, initial]);
  const realCrew = crew.filter((m) => m.id !== "none");
  const names = useMemo(() => new Map(options.map((o) => [o.id, o.label] as [string, string]).concat(me ? [[me.id, "Jij"]] : [])), [options, me]);
  const checkAt = f.date ? new Date(`${f.date}T${f.time || "00:00"}`).toISOString() : null;
  const conflicts = useConflicts(isEscort ? (me ? [me.id] : []) : realCrew.map((m) => m.id), checkAt);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const submit = async () => {
    if (!f.pickup.trim() || !f.dropoff.trim() || !f.date) return toast.error("Vul laadlocatie, loslocatie en datum in");
    if (isEscort && f.party === "none") return toast.error("Kies een planner");
    setBusy(true);
    try {
      const { data: geo, error: gErr } = await supabase.functions.invoke("google-geocode", { body: { queries: [f.pickup, f.dropoff] } });
      if (gErr) throw new Error("Adres kon niet worden opgezocht");
      const [p, d] = (geo?.results ?? []) as any[];
      if (p?.lat == null || d?.lat == null) throw new Error("Adres niet gevonden, controleer laad- en loslocatie");
      const scheduled = new Date(`${f.date}T${f.time || "00:00"}`).toISOString();
      const { data: rideId, error } = await supabase.rpc("create_relation_ride", {
        _pickup_address: p.formatted ?? f.pickup, _pickup_city: cityOf(p.formatted ?? f.pickup, f.pickup), _pickup_lat: p.lat, _pickup_lng: p.lng,
        _dropoff_address: d.formatted ?? f.dropoff, _dropoff_city: cityOf(d.formatted ?? f.dropoff, f.dropoff), _dropoff_lat: d.lat, _dropoff_lng: d.lng,
        _scheduled_at: scheduled, _permit_number: f.permit, _client_reference: f.reference, _notes: f.notes,
        _length_m: num(f.length), _width_m: num(f.width), _height_m: num(f.height), _weight_t: num(f.weight),
        _plates: f.plates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
        _rate_type: f.rateType, _rate_amount: num(f.rate),
        _counterparty: isEscort ? (f.party === "none" ? null : f.party) : (realCrew[0]?.id ?? null),
      } as any);
      if (error) throw error;
      if (!isEscort && rideId) {
        for (const m of realCrew) {
          const { error: e2 } = await supabase.rpc("add_ride_escort", { _ride_id: rideId as string, _escort_id: m.id, _role: m.role });
          if (e2) toast.error(e2.message);
        }
      }
      if (files.length && rideId) {
        const { data: { user: me } } = await supabase.auth.getUser();
        const clientId = isEscort ? f.party : me?.id;
        if (clientId) await uploadRideDocs(clientId, rideId as string, files);
      }
      supabase.functions.invoke("google-calendar-sync").catch(() => {});
      toast.success("Rit toegevoegd");
      setF(emptyRide);
      setFiles([]);
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Opslaan mislukt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5" />{initial ? "Rit dupliceren" : "Nieuwe rit toevoegen"}</DialogTitle></DialogHeader>
        {initial && <p className="text-sm text-muted-foreground -mt-2">Route, afmetingen en referenties zijn overgenomen. Kies nog datum, tijd en toewijzing.</p>}
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Dossier-/vergunningnummer</Label><Input value={f.permit} onChange={set("permit")} /></div>
            <div><Label>Eigen referentie</Label><Input value={f.reference} onChange={set("reference")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Datum</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
            <div><Label>Tijd</Label><Input type="time" value={f.time} onChange={set("time")} /></div>
          </div>
          <div><Label>Laadlocatie</Label><Input value={f.pickup} onChange={set("pickup")} placeholder="Adres of plaats" /></div>
          <div><Label>Loslocatie</Label><Input value={f.dropoff} onChange={set("dropoff")} placeholder="Adres of plaats" /></div>
          <div>
            <Label>Afmetingen (m) en gewicht (t)</Label>
            <div className="grid grid-cols-4 gap-2">
              <Input placeholder="Lengte" value={f.length} onChange={set("length")} inputMode="decimal" />
              <Input placeholder="Breedte" value={f.width} onChange={set("width")} inputMode="decimal" />
              <Input placeholder="Hoogte" value={f.height} onChange={set("height")} inputMode="decimal" />
              <Input placeholder="Gewicht" value={f.weight} onChange={set("weight")} inputMode="decimal" />
            </div>
          </div>
          <div><Label>Kenteken(s)</Label><Input value={f.plates} onChange={set("plates")} placeholder="bv. 12-ABC-3, OX-45-YZ" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tariefafspraak</Label>
              <Select value={f.rateType} onValueChange={set("rateType")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Uurtarief</SelectItem>
                  <SelectItem value="km">Kilometertarief</SelectItem>
                  <SelectItem value="fixed">Vaste prijs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Bedrag (€, excl. btw)</Label><Input value={f.rate} onChange={set("rate")} inputMode="decimal" /></div>
          </div>
          <div>
            <Label>{isEscort ? "Planner" : "Begeleider(s) (optioneel)"}</Label>
            {isEscort ? (
              <Select value={f.party} onValueChange={set("party")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kies planner</SelectItem>
                  {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <CrewEditor crew={crew} onChange={setCrew} options={options} />
            )}
            {!options.length && <p className="text-xs text-slate-500 mt-1">Voeg eerst een vaste relatie toe onder "Vaste relaties".</p>}
          </div>
          <ConflictBanner conflicts={conflicts} names={names} />
          <div><Label>Opmerkingen</Label><Textarea rows={2} value={f.notes} onChange={set("notes")} /></div>
          <div>
            <Label>Documenten (ontheffing, routebeschrijving, tekeningen)</Label>
            <Input type="file" multiple accept=".pdf,image/*,.dwg,.dxf,.doc,.docx,.xls,.xlsx" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
            {files.length > 0 && <p className="text-xs text-muted-foreground mt-1">{files.map((x) => x.name).join(", ")}</p>}
            <p className="text-xs text-muted-foreground mt-1">Max. 20 MB per bestand. Alleen zichtbaar voor jou en de toegewezen begeleider.</p>
          </div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? "Opslaan…" : "Rit opslaan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TicketDialog = ({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) => {
  const [v, setV] = useState({ hours: "", km: "", waiting: "", correction: "", correctionNote: "", notes: "" });
  const [items, setItems] = useState<{ description: string; amount: string }[]>([]);
  const [preview, setPreview] = useState<Breakdown | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const s = (x: number | null | undefined) => (x != null ? String(x) : "");
    const b = row?.breakdown;
    setV({ hours: s(row?.hours), km: s(row?.km), waiting: s(row?.waiting), correction: b?.correction ? String(b.correction) : "",
      correctionNote: (b as any)?.correction_note ?? "", notes: row?.notes ?? "" });
    setItems((b?.expenses ?? []).map((e) => ({ description: e.description ?? "", amount: String(e.amount) })));
    setPreview(null);
  }, [row]);
  const set = (k: keyof typeof v) => (e: any) => setV({ ...v, [k]: e.target.value });

  const payloadItems = items
    .filter((i) => i.amount.trim() !== "")
    .map((i) => ({ description: i.description.trim(), amount: num(i.amount) ?? 0 }));

  useEffect(() => {
    if (!row?.assignmentId) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("calc_ride_ticket", {
        _assignment_id: row.assignmentId!, _hours: num(v.hours) ?? 0, _km: num(v.km), _waiting: num(v.waiting),
        _expense_items: payloadItems as any, _correction: num(v.correction),
      } as any);
      if (data) setPreview(data as unknown as Breakdown);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, v.hours, v.km, v.waiting, v.correction, JSON.stringify(items)]);

  const save = async () => {
    if (!row?.assignmentId) return;
    const h = num(v.hours);
    if (h == null || !Number.isFinite(h) || h <= 0) return toast.error("Vul de werkelijke uren in");
    if (num(v.correction) && !v.correctionNote.trim()) return toast.error("Geef een toelichting bij de correctie");
    setBusy(true);
    const { error } = await supabase.rpc("submit_ride_ticket_v2", {
      _assignment_id: row.assignmentId, _hours: h, _km: num(v.km), _waiting_hours: num(v.waiting),
      _expense_items: payloadItems as any, _correction: num(v.correction), _correction_note: v.correctionNote, _notes: v.notes,
    } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ritbon ingediend en automatisch goedgekeurd");
    deleteRideDocs(row.clientId, row.rideId).catch(() => {});
    supabase.functions.invoke("notify-ticket-submitted", { body: { assignmentId: row.assignmentId } }).catch(() => {});
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Digitale ritbon</DialogTitle></DialogHeader>
        {row && <p className="text-sm text-slate-500">{row.rideNumber} · {row.pickup} → {row.dropoff} · {fmt(row.scheduledAt)} · {row.counterparty}</p>}
        {row?.ticketStatus === "rejected" && row.rejectReason && <p className="text-sm text-destructive">Afgekeurd: {row.rejectReason}</p>}
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Uren</Label><Input inputMode="decimal" value={v.hours} onChange={set("hours")} placeholder="6,5" /></div>
          <div><Label>Kilometers</Label><Input inputMode="decimal" value={v.km} onChange={set("km")} placeholder="240" /></div>
          <div><Label>Wachturen</Label><Input inputMode="decimal" value={v.waiting} onChange={set("waiting")} placeholder="0" /></div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Losse onkosten</Label>
            <Button type="button" size="sm" variant="ghost" onClick={() => setItems([...items, { description: "", amount: "" }])}>
              <Plus className="h-4 w-4 mr-1" />Toevoegen
            </Button>
          </div>
          {items.length === 0 && <p className="text-xs text-slate-500">Bijv. tol, pontgeld of vergunning.</p>}
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex gap-2">
                <Input placeholder="Omschrijving" value={it.description} onChange={(e) => setItems(items.map((x, j) => (j === idx ? { ...x, description: e.target.value } : x)))} />
                <Input className="w-28" inputMode="decimal" placeholder="€" value={it.amount} onChange={(e) => setItems(items.map((x, j) => (j === idx ? { ...x, amount: e.target.value } : x)))} />
                <Button type="button" size="icon" variant="ghost" aria-label="Verwijderen" onClick={() => setItems(items.filter((_, j) => j !== idx))}><X className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Correctie (€ ±)</Label><Input inputMode="decimal" value={v.correction} onChange={set("correction")} placeholder="0" /></div>
          <div className="col-span-2"><Label>Toelichting correctie</Label><Input value={v.correctionNote} onChange={set("correctionNote")} /></div>
        </div>
        <div><Label>Opmerkingen</Label><Textarea rows={2} value={v.notes} onChange={set("notes")} /></div>
        {preview && <BreakdownView b={preview} />}
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Indienen…" : "Ritbon indienen"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReviewDialog = ({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setReason(""), [row]);

  const canReject = !!row && !row.invoicedAt && (row.ticketStatus === "submitted" || row.ticketStatus === "approved");
  const decide = async (approve: boolean) => {
    if (!row?.assignmentId) return;
    if (!approve && !reason.trim()) return toast.error("Geef een reden voor afkeuren");
    setBusy(true);
    const { error } = await supabase.rpc("review_ride_ticket", { _assignment_id: row.assignmentId, _approve: approve, _reason: reason });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Ritbon goedgekeurd" : "Ritbon teruggestuurd naar de begeleider");
    onClose();
    onSaved();
  };

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4"><SheetTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Ritbon bekijken</SheetTitle></SheetHeader>
        {row && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{row.rideNumber} · {row.pickup} → {row.dropoff} · {fmt(row.scheduledAt)} · {row.counterparty}</p>
            {row.breakdown ? <BreakdownView b={row.breakdown} /> : (
              <p className="text-sm">Totaal: {eur(Number(row.cost ?? 0))} ({Number(row.hours ?? 0)} u, {Number(row.km ?? 0)} km)</p>
            )}
            {row.notes && <p className="text-sm"><span className="text-slate-500">Opmerkingen: </span>{row.notes}</p>}
            {canReject && (
              <div><Label>Reden bij afkeuren</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            )}
          </div>
        )}
        {canReject && (
          <SheetFooter className="gap-2 mt-6">
            <Button variant="outline" disabled={busy} onClick={() => decide(false)}>Afkeuren</Button>
            {row?.ticketStatus === "submitted" && <Button disabled={busy} onClick={() => decide(true)}>Goedkeuren</Button>}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
};

const AddEscortDialog = ({ row, options, onClose, onSaved }: { row: Row | null; options: Option[]; onClose: () => void; onSaved: () => void }) => {
  const [crew, setCrew] = useState<CrewMember[]>([{ id: "none", role: ESCORT_ROLES[1] }]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (row) setCrew([{ id: "none", role: ESCORT_ROLES[1] }]); }, [row]);
  const real = crew.filter((m) => m.id !== "none");
  const names = useMemo(() => new Map(options.map((o) => [o.id, o.label] as [string, string])), [options]);
  const conflicts = useConflicts(real.map((m) => m.id), row?.scheduledAt ?? null, row?.rideId);
  const save = async () => {
    if (!row || !real.length) return toast.error("Kies een begeleider");
    setBusy(true);
    for (const m of real) {
      const { error } = await supabase.rpc("add_ride_escort", { _ride_id: row.rideId, _escort_id: m.id, _role: m.role });
      if (error) toast.error(error.message);
    }
    setBusy(false);
    supabase.functions.invoke("google-calendar-sync").catch(() => {});
    toast.success("Begeleider(s) toegevoegd — elk krijgt een eigen ritbon");
    onClose(); onSaved();
  };
  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Begeleider toevoegen — {row?.rideNumber}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{row?.pickup} → {row?.dropoff} · {row && fmt(row.scheduledAt)}</p>
        <CrewEditor crew={crew} onChange={setCrew} options={options} />
        <ConflictBanner conflicts={conflicts} names={names} />
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Opslaan…" : "Toevoegen"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
