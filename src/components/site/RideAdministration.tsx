import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, FileText, Plus, Route, Sun, ClipboardCheck, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
import { RelationsCard } from "@/components/site/RelationsCard";
import { BreakdownView, type Breakdown } from "@/components/site/TicketBreakdown";

type Bucket = "gepland" | "vandaag" | "afgerond";
type TicketStatus = "none" | "submitted" | "approved" | "rejected";

interface Row {
  rideId: string;
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

const bucketOf = (r: Row): Bucket => {
  if (r.rideStatus === "completed" || r.ticketStatus !== "none") return "afgerond";
  const d = new Date(r.scheduledAt);
  const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
  if (r.rideStatus === "in_progress" || d <= endOfToday) return "vandaag";
  return "gepland";
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
  const [weekOffset, setWeekOffset] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: rel } = await supabase.rpc("list_relations");
      const accepted = (rel ?? []).filter((r: any) => r.status === "accepted");
      const names = new Map<string, string>(accepted.map((r: any) => [r.other_id, r.name]));
      setOptions(accepted.map((r: any) => ({ id: r.other_id, label: r.name })));

      const toRow = (r: any, a: any, counterparty: string): Row => ({
        rideId: r.id, rideNumber: r.ride_number, reference: r.client_reference, permit: r.permit_number,
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
          return [toRow(r, a, names.get(r.client_id) ?? "Planner")];
        }));
      } else {
        const { data: rides } = await supabase.from("rides").select("*, ride_assignments(*)").eq("client_id", user.id).neq("status", "cancelled");
        setRows((rides ?? []).map((r: any) => {
          const a = (r.ride_assignments ?? []).find((x: any) => x.status === "accepted");
          return toRow(r, a, a ? names.get(a.escort_id) ?? "Begeleider" : "Nog niet toegewezen");
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

  const weekRange = useMemo(() => {
    if (weekOffset == null) return null;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return { start, end };
  }, [weekOffset]);

  const counterparties = useMemo(() => [...new Set(rows.map((r) => r.counterparty))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cpFilter !== "all" && r.counterparty !== cpFilter) return false;
      if (ticketFilter !== "all" && r.ticketStatus !== ticketFilter) return false;
      if (weekRange) { const d = new Date(r.scheduledAt); if (d < weekRange.start || d >= weekRange.end) return false; }
      if (needle) {
        const hay = [r.rideNumber, r.permit, r.reference, r.pickup, r.dropoff, `${r.pickup} ${r.dropoff}`, ...r.plates].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, cpFilter, ticketFilter, weekRange]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, Row[]> = { gepland: [], vandaag: [], afgerond: [] };
    filtered.forEach((r) => g[bucketOf(r)].push(r));
    g.gepland.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    g.vandaag.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    g.afgerond.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    return g;
  }, [filtered]);

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
              <TableRow key={r.rideId} data-state={r.assignmentId && selected.has(r.assignmentId) ? "selected" : undefined}>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const weekLabel = weekRange
    ? `${weekRange.start.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} – ${new Date(+weekRange.end - 1).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}`
    : "Alle weken";

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
        <Tabs defaultValue="vandaag">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="gepland"><CalendarClock className="h-4 w-4 mr-1" />Gepland ({grouped.gepland.length})</TabsTrigger>
              <TabsTrigger value="vandaag"><Sun className="h-4 w-4 mr-1" />Vandaag / Actief ({grouped.vandaag.length})</TabsTrigger>
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
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek dossier, referentie, traject, kenteken…" className="h-8 pl-8 text-sm" />
            </div>
            <Select value={cpFilter} onValueChange={setCpFilter}>
              <SelectTrigger className="h-8 w-[170px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEscort ? "Alle planners" : "Alle begeleiders"}</SelectItem>
                {counterparties.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={ticketFilter} onValueChange={setTicketFilter}>
              <SelectTrigger className="h-8 w-[160px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ritbon: alles</SelectItem>
                <SelectItem value="rejected">Afgekeurd</SelectItem>
                <SelectItem value="approved">Goedgekeurd</SelectItem>
                <SelectItem value="none">Nog geen ritbon</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-md border bg-background h-8">
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Vorige week" onClick={() => setWeekOffset((w) => (w ?? 0) - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <button className="px-2 text-xs whitespace-nowrap min-w-[110px]" onClick={() => setWeekOffset((w) => (w == null ? 0 : null))} title="Wissel tussen deze week en alle weken">{weekLabel}</button>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Volgende week" onClick={() => setWeekOffset((w) => (w ?? 0) + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {loading ? <p className="text-sm text-slate-500 py-10 text-center">Laden…</p> : (
            <>
              <TabsContent value="gepland">{renderTable("gepland")}</TabsContent>
              <TabsContent value="vandaag">{renderTable("vandaag")}</TabsContent>
              <TabsContent value="afgerond">{renderTable("afgerond")}</TabsContent>
            </>
          )}
        </Tabs>
      </Card>

      <RelationsCard onChange={load} />

      <NewRideDialog open={newOpen} onOpenChange={setNewOpen} isEscort={isEscort} options={options} onCreated={load} />
      <TicketDialog row={ticketRow} onClose={() => setTicketRow(null)} onSaved={load} />
      <ReviewDialog row={reviewRow} onClose={() => setReviewRow(null)} onSaved={load} />
    </div>
  );
};

const emptyRide = {
  pickup: "", dropoff: "", date: "", time: "08:00", permit: "", reference: "", notes: "",
  length: "", width: "", height: "", weight: "", plates: "", rateType: "hourly", rate: "", party: "none",
};

const NewRideDialog = ({ open, onOpenChange, isEscort, options, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; isEscort: boolean; options: Option[]; onCreated: () => void;
}) => {
  const [f, setF] = useState(emptyRide);
  const [busy, setBusy] = useState(false);
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
      const { error } = await supabase.rpc("create_relation_ride", {
        _pickup_address: p.formatted ?? f.pickup, _pickup_city: cityOf(p.formatted ?? f.pickup, f.pickup), _pickup_lat: p.lat, _pickup_lng: p.lng,
        _dropoff_address: d.formatted ?? f.dropoff, _dropoff_city: cityOf(d.formatted ?? f.dropoff, f.dropoff), _dropoff_lat: d.lat, _dropoff_lng: d.lng,
        _scheduled_at: scheduled, _permit_number: f.permit, _client_reference: f.reference, _notes: f.notes,
        _length_m: num(f.length), _width_m: num(f.width), _height_m: num(f.height), _weight_t: num(f.weight),
        _plates: f.plates.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
        _rate_type: f.rateType, _rate_amount: num(f.rate),
        _counterparty: f.party === "none" ? null : f.party,
      } as any);
      if (error) throw error;
      supabase.functions.invoke("google-calendar-sync").catch(() => {});
      toast.success("Rit toegevoegd");
      setF(emptyRide);
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
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Nieuwe rit toevoegen</DialogTitle></DialogHeader>
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
            <Label>{isEscort ? "Planner" : "Begeleider (optioneel)"}</Label>
            <Select value={f.party} onValueChange={set("party")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isEscort ? "Kies planner" : "Nog niet toewijzen"}</SelectItem>
                {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {!options.length && <p className="text-xs text-slate-500 mt-1">Voeg eerst een vaste relatie toe onder "Vaste relaties".</p>}
          </div>
          <div><Label>Opmerkingen</Label><Textarea rows={2} value={f.notes} onChange={set("notes")} /></div>
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
