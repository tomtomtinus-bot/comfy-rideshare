import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, CheckCircle2, FileText, Plus, Route, Timer } from "lucide-react";
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

type Bucket = "gepland" | "lopend" | "afgerond";

interface Row {
  rideId: string;
  rideNumber: string;
  reference: string | null;
  permit: string | null;
  pickup: string;
  dropoff: string;
  scheduledAt: string;
  rideStatus: string;
  assignmentId: string | null;
  counterparty: string;
  hours: number | null;
  km: number | null;
  ticketAt: string | null;
  invoicedAt: string | null;
}

interface Option { id: string; label: string }

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const bucketOf = (r: Row): Bucket => {
  if (r.ticketAt || r.rideStatus === "completed") return "afgerond";
  if (r.rideStatus === "in_progress" || new Date(r.scheduledAt).getTime() <= Date.now()) return "lopend";
  return "gepland";
};

const cityOf = (formatted: string, fallback: string) => {
  const parts = formatted.split(",").map((s) => s.trim());
  const cand = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return (cand || fallback).replace(/^\d{4}\s?[A-Z]{0,2}\s*/, "") || fallback;
};

export const RideAdministration = () => {
  const { user, role } = useAuth();
  const isEscort = role === "begeleider";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState<Option[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [ticketRow, setTicketRow] = useState<Row | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (isEscort) {
        const { data: as } = await supabase
          .from("ride_assignments")
          .select("id, ride_id, actual_hours, ticket_km, ticket_created_at, invoiced_at")
          .eq("escort_id", user.id)
          .eq("status", "accepted");
        const list = as ?? [];
        const ids = list.map((a) => a.ride_id);
        const { data: rides } = ids.length
          ? await supabase.from("rides").select("*").in("id", ids)
          : { data: [] as any[] };
        const clientIds = [...new Set((rides ?? []).map((r: any) => r.client_id))];
        const { data: profs } = clientIds.length
          ? await supabase.from("profiles").select("id, anonymous_id, company_name").in("id", clientIds)
          : { data: [] as any[] };
        const pm = new Map((profs ?? []).map((p: any) => [p.id, p.company_name || p.anonymous_id || "—"]));
        const rm = new Map((rides ?? []).map((r: any) => [r.id, r]));
        setRows(
          list.flatMap((a) => {
            const r: any = rm.get(a.ride_id);
            if (!r || r.status === "cancelled") return [];
            return [{
              rideId: r.id, rideNumber: r.ride_number, reference: r.client_reference, permit: r.permit_number,
              pickup: r.pickup_city, dropoff: r.dropoff_city, scheduledAt: r.scheduled_at, rideStatus: r.status,
              assignmentId: a.id, counterparty: pm.get(r.client_id) ?? "—",
              hours: a.actual_hours, km: (a as any).ticket_km, ticketAt: (a as any).ticket_created_at, invoicedAt: a.invoiced_at,
            }];
          }),
        );
        const [{ data: pref }, { data: elig }] = await Promise.all([
          supabase.rpc("escort_preferred_client_details"),
          supabase.rpc("escort_eligible_clients"),
        ]);
        const m = new Map<string, string>();
        (pref ?? []).forEach((p: any) => m.set(p.client_id, p.company_name || p.anonymous_id));
        (elig ?? []).forEach((p: any) => !m.has(p.id) && m.set(p.id, p.company_name || p.anonymous_id));
        setOptions([...m].map(([id, label]) => ({ id, label })));
      } else {
        const { data: rides } = await supabase
          .from("rides")
          .select("*, ride_assignments(id, escort_id, status, actual_hours, ticket_km, ticket_created_at, invoiced_at)")
          .eq("client_id", user.id)
          .neq("status", "cancelled");
        const { data: esc } = await supabase.rpc("client_eligible_escorts");
        const em = new Map((esc ?? []).map((e: any) => [e.id, e.full_name || e.company_name || e.anonymous_id]));
        setOptions((esc ?? []).map((e: any) => ({ id: e.id, label: em.get(e.id) as string })));
        setRows(
          (rides ?? []).map((r: any) => {
            const a = (r.ride_assignments ?? []).find((x: any) => x.status === "accepted");
            return {
              rideId: r.id, rideNumber: r.ride_number, reference: r.client_reference, permit: r.permit_number,
              pickup: r.pickup_city, dropoff: r.dropoff_city, scheduledAt: r.scheduled_at, rideStatus: r.status,
              assignmentId: a?.id ?? null, counterparty: a ? (em.get(a.escort_id) as string) ?? "Begeleider" : "Nog niet toegewezen",
              hours: a?.actual_hours ?? null, km: a?.ticket_km ?? null, ticketAt: a?.ticket_created_at ?? null, invoicedAt: a?.invoiced_at ?? null,
            };
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user, isEscort]);

  useEffect(() => { load(); }, [load]);

  const grouped = useMemo(() => {
    const g: Record<Bucket, Row[]> = { gepland: [], lopend: [], afgerond: [] };
    rows.forEach((r) => g[bucketOf(r)].push(r));
    g.gepland.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    g.lopend.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    g.afgerond.sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt));
    return g;
  }, [rows]);

  const invoiceSelected = async () => {
    const { data, error } = await supabase.rpc("invoice_selected_tickets", { _assignment_ids: [...selected] });
    if (error) return toast.error(error.message);
    toast.success(`${data} factuur/facturen aangemaakt`);
    setSelected(new Set());
    load();
  };

  const detailHref = (r: Row) => (isEscort ? `/opdracht/${r.rideId}` : `/rit/${r.rideId}`);

  const renderTable = (bucket: Bucket) => {
    const list = grouped[bucket];
    if (!list.length) return <p className="text-sm text-slate-500 py-10 text-center">Geen ritten.</p>;
    const done = bucket === "afgerond";
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {done && isEscort && <TableHead className="w-8" />}
            <TableHead>Rit</TableHead>
            <TableHead>Route</TableHead>
            <TableHead>Datum/tijd</TableHead>
            <TableHead>Vergunning</TableHead>
            <TableHead>{isEscort ? "Opdrachtgever" : "Begeleider"}</TableHead>
            {done && <TableHead>Ritbon</TableHead>}
            <TableHead className="text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((r) => {
            const canInvoice = isEscort && !!r.ticketAt && !r.invoicedAt && r.assignmentId;
            const canTicket = !!r.assignmentId && !r.invoicedAt && bucket !== "gepland";
            return (
              <TableRow key={r.rideId}>
                {done && isEscort && (
                  <TableCell>
                    {canInvoice && (
                      <Checkbox
                        checked={selected.has(r.assignmentId!)}
                        onCheckedChange={(v) => {
                          const s = new Set(selected);
                          v ? s.add(r.assignmentId!) : s.delete(r.assignmentId!);
                          setSelected(s);
                        }}
                        aria-label="Selecteer voor facturatie"
                      />
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Link to={detailHref(r)} className="font-medium hover:underline">{r.rideNumber}</Link>
                  {r.reference && <div className="text-xs text-slate-500">{r.reference}</div>}
                </TableCell>
                <TableCell>{r.pickup} → {r.dropoff}</TableCell>
                <TableCell className="whitespace-nowrap">{fmt(r.scheduledAt)}</TableCell>
                <TableCell>{r.permit ?? "—"}</TableCell>
                <TableCell>{r.counterparty}</TableCell>
                {done && (
                  <TableCell>
                    {r.ticketAt ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{Number(r.hours ?? 0)} u{r.km != null ? ` · ${Number(r.km)} km` : ""}</span>
                        {r.invoicedAt ? <Badge variant="secondary">Gefactureerd</Badge> : <Badge variant="outline">Klaar voor factuur</Badge>}
                      </div>
                    ) : <span className="text-sm text-slate-500">Nog geen ritbon</span>}
                  </TableCell>
                )}
                <TableCell className="text-right">
                  {canTicket && (
                    <Button size="sm" variant="outline" onClick={() => setTicketRow(r)}>
                      <FileText className="h-4 w-4 mr-1" />{r.ticketAt ? "Ritbon wijzigen" : "Ritbon maken"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rittenoverzicht</h1>
          <p className="text-sm text-slate-500">Plan, administreer en factureer ritten met je vaste relaties.</p>
        </div>
        <Button onClick={() => setNewOpen(true)}><Plus className="h-4 w-4 mr-1" />Nieuwe rit toevoegen</Button>
      </div>

      <Card className="p-4">
        <Tabs defaultValue="gepland">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <TabsList>
              <TabsTrigger value="gepland"><CalendarClock className="h-4 w-4 mr-1" />Gepland ({grouped.gepland.length})</TabsTrigger>
              <TabsTrigger value="lopend"><Timer className="h-4 w-4 mr-1" />Lopend ({grouped.lopend.length})</TabsTrigger>
              <TabsTrigger value="afgerond"><CheckCircle2 className="h-4 w-4 mr-1" />Afgerond ({grouped.afgerond.length})</TabsTrigger>
            </TabsList>
            {isEscort && selected.size > 0 && (
              <Button size="sm" onClick={invoiceSelected}>Factureer selectie ({selected.size})</Button>
            )}
          </div>
          {loading ? <p className="text-sm text-slate-500 py-10 text-center">Laden…</p> : (
            <>
              <TabsContent value="gepland">{renderTable("gepland")}</TabsContent>
              <TabsContent value="lopend">{renderTable("lopend")}</TabsContent>
              <TabsContent value="afgerond">{renderTable("afgerond")}</TabsContent>
            </>
          )}
        </Tabs>
      </Card>

      <NewRideDialog open={newOpen} onOpenChange={setNewOpen} isEscort={isEscort} options={options} onCreated={load} />
      <TicketDialog row={ticketRow} onClose={() => setTicketRow(null)} onSaved={load} />
    </div>
  );
};

const NewRideDialog = ({ open, onOpenChange, isEscort, options, onCreated }: {
  open: boolean; onOpenChange: (v: boolean) => void; isEscort: boolean; options: Option[]; onCreated: () => void;
}) => {
  const [f, setF] = useState({ pickup: "", dropoff: "", date: "", time: "08:00", permit: "", reference: "", notes: "", party: "none" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const submit = async () => {
    if (!f.pickup.trim() || !f.dropoff.trim() || !f.date) return toast.error("Vul vertrek, bestemming en datum in");
    if (isEscort && f.party === "none") return toast.error("Kies een opdrachtgever");
    setBusy(true);
    try {
      const { data: geo, error: gErr } = await supabase.functions.invoke("google-geocode", { body: { queries: [f.pickup, f.dropoff] } });
      if (gErr) throw new Error("Adres kon niet worden opgezocht");
      const [p, d] = (geo?.results ?? []) as any[];
      if (p?.lat == null || d?.lat == null) throw new Error("Adres niet gevonden, controleer vertrek en bestemming");
      const scheduled = new Date(`${f.date}T${f.time || "00:00"}`).toISOString();
      const { error } = await supabase.rpc("create_direct_ride", {
        _pickup_address: p.formatted ?? f.pickup, _pickup_city: cityOf(p.formatted ?? f.pickup, f.pickup), _pickup_lat: p.lat, _pickup_lng: p.lng,
        _dropoff_address: d.formatted ?? f.dropoff, _dropoff_city: cityOf(d.formatted ?? f.dropoff, f.dropoff), _dropoff_lat: d.lat, _dropoff_lng: d.lng,
        _scheduled_at: scheduled, _permit_number: f.permit, _client_reference: f.reference, _notes: f.notes,
        _counterparty: f.party === "none" ? null : f.party,
      } as any);
      if (error) throw error;
      if (isEscort) supabase.functions.invoke("google-calendar-sync").catch(() => {});
      toast.success("Rit toegevoegd");
      setF({ pickup: "", dropoff: "", date: "", time: "08:00", permit: "", reference: "", notes: "", party: "none" });
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Nieuwe rit toevoegen</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Vertrek</Label><Input value={f.pickup} onChange={set("pickup")} placeholder="Adres of plaats" /></div>
          <div><Label>Bestemming</Label><Input value={f.dropoff} onChange={set("dropoff")} placeholder="Adres of plaats" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Datum</Label><Input type="date" value={f.date} onChange={set("date")} /></div>
            <div><Label>Tijd</Label><Input type="time" value={f.time} onChange={set("time")} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Vergunningnummer</Label><Input value={f.permit} onChange={set("permit")} /></div>
            <div><Label>Dossier-/referentienummer</Label><Input value={f.reference} onChange={set("reference")} /></div>
          </div>
          <div>
            <Label>{isEscort ? "Opdrachtgever" : "Vaste begeleider (optioneel)"}</Label>
            <Select value={f.party} onValueChange={set("party")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{isEscort ? "Kies opdrachtgever" : "Nog niet toewijzen"}</SelectItem>
                {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {!options.length && <p className="text-xs text-slate-500 mt-1">Nog geen vaste relaties gevonden.</p>}
          </div>
          <div><Label>Opmerkingen</Label><Textarea rows={2} value={f.notes} onChange={set("notes")} /></div>
        </div>
        <DialogFooter><Button onClick={submit} disabled={busy}>{busy ? "Opslaan…" : "Rit opslaan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const TicketDialog = ({ row, onClose, onSaved }: { row: Row | null; onClose: () => void; onSaved: () => void }) => {
  const [hours, setHours] = useState("");
  const [km, setKm] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setHours(row?.hours != null ? String(row.hours) : "");
    setKm(row?.km != null ? String(row.km) : "");
    setNotes("");
  }, [row]);

  const save = async () => {
    if (!row?.assignmentId) return;
    const h = Number(hours.replace(",", "."));
    const k = km ? Number(km.replace(",", ".")) : null;
    if (!Number.isFinite(h) || h <= 0) return toast.error("Vul het aantal gewerkte uren in");
    setBusy(true);
    const { error } = await supabase.rpc("save_ride_ticket", { _assignment_id: row.assignmentId, _hours: h, _km: k, _notes: notes } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Ritbon opgeslagen");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!row} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Digitale ritbon</DialogTitle></DialogHeader>
        {row && <p className="text-sm text-slate-500">{row.rideNumber} · {row.pickup} → {row.dropoff} · {fmt(row.scheduledAt)}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Gewerkte uren</Label><Input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="bv. 6,5" /></div>
          <div><Label>Kilometers</Label><Input inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="bv. 240" /></div>
        </div>
        <div><Label>Opmerkingen</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Opslaan…" : "Ritbon opslaan"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
