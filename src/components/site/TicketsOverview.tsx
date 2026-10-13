import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type T = { permit: string; clientRef: string; role: string; bd: any;
  id: string; date: string; rideNumber: string; reference: string; route: string; escort: string;
  hours: number | null; km: number | null; waiting: number | null; expenses: number | null; amount: number | null;
  status: string; invoiced: boolean;
};

const money = (n: number | null) => n == null ? "" : n.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
const dnl = (iso: string) => iso ? new Date(iso).toLocaleDateString("nl-NL") : "";

export const TicketsOverview = ({ search, dateFrom, dateTo }: { search: string; dateFrom: string; dateTo: string }) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: rel } = await supabase.rpc("list_relations");
      const names = new Map<string, string>((rel ?? []).map((r: any) => [r.other_id, r.name]));
      const { data: rides } = await supabase.from("rides").select("*, ride_assignments(*)").eq("client_id", user.id).neq("status", "cancelled");
      const out: T[] = [];
      (rides ?? []).forEach((r: any) => (r.ride_assignments ?? []).forEach((a: any) => {
        if (a.ticket_status !== "approved") return;
        out.push({
          id: a.id, date: r.scheduled_at, rideNumber: r.ride_number ?? "", reference: r.client_reference || r.permit_number || "",
          route: `${r.pickup_city ?? ""} → ${r.dropoff_city ?? ""}`, escort: names.get(a.escort_id) ?? "Begeleider",
          hours: a.actual_hours, km: a.ticket_km, waiting: a.ticket_waiting_hours, expenses: a.ticket_expenses, amount: a.actual_cost,
          status: a.ticket_status, invoiced: !!a.invoiced_at,
          permit: r.permit_number ?? "", clientRef: r.client_reference ?? "", role: a.escort_role ?? "", bd: a.ticket_breakdown ?? null,
        });
      }));
      out.sort((x, y) => (x.escort.localeCompare(y.escort, "nl") || y.date.localeCompare(x.date)));
      setRows(out);
      setLoading(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const d = r.date?.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return !q || [r.rideNumber, r.reference, r.route, r.escort].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, search, dateFrom, dateTo]);

  const total = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);

  const exportCsv = () => {
    const num = (n: number | null) => n == null ? "" : String(n).replace(".", ",");
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const head = ["Datum", "Ritnummer", "Dossier-/vergunningnummer", "Eigen referentie", "Traject", "Begeleider", "Rol",
      "Uren", "Factureerbare uren", "Uurtarief", "Bedrag uren", "Km", "Km-tarief", "Bedrag km", "Wachturen", "Bedrag wachturen",
      "Toeslag", "Toeslag %", "Bedrag toeslag", "Brandstoftoeslag", "Onkosten", "Correctie", "Totaal excl. btw", "Gefactureerd"];
    const lines = filtered.map((r) => {
      const b: any = r.bd ?? {};
      return [dnl(r.date), r.rideNumber, r.permit, r.clientRef, r.route, r.escort, r.role,
        num(r.hours), num(b.billable_hours ?? null), num(b.hourly_rate ?? null), num(b.hours_amount ?? b.fixed_amount ?? null),
        num(r.km), num(b.km_rate ?? null), num(b.km_amount ?? null), num(r.waiting), num(b.waiting_amount ?? null),
        b.surcharge_label ?? "", num(b.surcharge_pct ?? null), num(b.surcharge_amount ?? null), num(b.fuel_amount ?? null),
        num(b.expenses_amount ?? r.expenses), num(b.correction ?? null), num(r.amount), r.invoiced ? "Ja" : "Nee"].map((v) => esc(String(v))).join(";");
    });
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ritbonnen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Goedgekeurde ritbonnen ({filtered.length}) · totaal {money(total)}</h2>
        <Button size="sm" variant="outline" className="h-8" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="h-4 w-4 mr-1" />Exporteer naar Excel/CSV
        </Button>
      </div>
      <div className="rounded-md border border-input bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-8">Datum</TableHead><TableHead className="h-8">Rit</TableHead><TableHead className="h-8">Traject</TableHead>
              <TableHead className="h-8">Begeleider</TableHead><TableHead className="h-8 text-right">Uren</TableHead><TableHead className="h-8 text-right">Km</TableHead>
              <TableHead className="h-8 text-right">Bedrag</TableHead><TableHead className="h-8">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Laden…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">Geen ritbonnen gevonden.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id} className="text-sm">
                <TableCell className="py-1.5 tabular-nums">{dnl(r.date)}</TableCell>
                <TableCell className="py-1.5"><span className="font-medium">{r.rideNumber}</span>{r.reference && <span className="text-muted-foreground"> · {r.reference}</span>}</TableCell>
                <TableCell className="py-1.5 truncate max-w-[240px]">{r.route}</TableCell>
                <TableCell className="py-1.5">{r.escort}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{r.hours ?? ""}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{r.km ?? ""}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums font-medium">{money(r.amount)}</TableCell>
                <TableCell className="py-1.5">
                  <Badge variant="outline" className="font-normal">{r.invoiced ? "Gefactureerd" : "Goedgekeurd"}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
