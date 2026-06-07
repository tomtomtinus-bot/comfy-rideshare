import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RideRow {
  id: string;
  ride_number: string | null;
  client_id: string;
  pickup_city: string;
  dropoff_city: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at: string;
  num_escorts: number;
  status: string;
  app_fee: number;
  client_name?: string;
  assignment_count?: number;
}

const fmt = (d: string) => {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
};

const STATUSES = ["open", "matched", "in_progress", "completed", "cancelled"];

const statusVariant = (s: string): { className: string; label: string } => {
  switch (s) {
    case "open":
      return { className: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200", label: "open" };
    case "matched":
      return { className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200", label: "matched" };
    case "in_progress":
      return { className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200", label: "lopend" };
    case "completed":
      return { className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200", label: "voltooid" };
    case "cancelled":
      return { className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200", label: "geannuleerd" };
    default:
      return { className: "bg-muted text-muted-foreground hover:bg-muted border-border", label: s };
  }
};

const AdminRides = () => {
  const [rides, setRides] = useState<RideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: rs, error } = await supabase
      .from("rides")
      .select("id, ride_number, client_id, pickup_city, dropoff_city, pickup_address, dropoff_address, scheduled_at, num_escorts, status, app_fee")
      .order("scheduled_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (rs ?? []) as RideRow[];
    const clientIds = [...new Set(list.map((r) => r.client_id))];
    const rideIds = list.map((r) => r.id);
    const [{ data: profs }, { data: ass }] = await Promise.all([
      clientIds.length
        ? supabase.from("profiles").select("id, full_name, company_name").in("id", clientIds)
        : Promise.resolve({ data: [] as any[] }),
      rideIds.length
        ? supabase.from("ride_assignments").select("ride_id, status").in("ride_id", rideIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.company_name || p.full_name || "—"]));
    const aMap = new Map<string, number>();
    (ass ?? []).forEach((a: any) => {
      if (a.status !== "declined" && a.status !== "expired" && a.status !== "cancelled") {
        aMap.set(a.ride_id, (aMap.get(a.ride_id) ?? 0) + 1);
      }
    });
    setRides(list.map((r) => ({ ...r, client_name: pMap.get(r.client_id), assignment_count: aMap.get(r.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("rides").update({ status: status as any }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Status bijgewerkt");
      load();
    }
  };

  const cancelRide = async (id: string) => {
    if (!confirm("Rit annuleren? Bestaande toewijzingen worden geannuleerd.")) return;
    const { error: e1 } = await supabase.from("rides").update({ status: "cancelled" as any }).eq("id", id);
    const { error: e2 } = await supabase
      .from("ride_assignments")
      .update({ status: "cancelled" as any })
      .eq("ride_id", id)
      .in("status", ["invited", "accepted"]);
    if (e1 || e2) toast.error((e1 ?? e2)!.message);
    else {
      toast.success("Rit geannuleerd");
      load();
    }
  };

  const filtered = rides.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      (r.ride_number ?? "").toLowerCase().includes(q) ||
      r.pickup_city.toLowerCase().includes(q) ||
      r.dropoff_city.toLowerCase().includes(q) ||
      (r.client_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Ritten</h2>
        <p className="text-sm text-brass-deep/80 mt-1">{filtered.length} ritten · alle aanvragen op het platform.</p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statussen</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{statusVariant(s).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op ritnummer, stad of opdrachtgever…"
          className="flex-1 min-w-[240px] h-9"
        />
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Ritnummer</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Datum &amp; tijd</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Opdrachtgever</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Route</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold text-center">Begeleiders</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
              <TableHead className="h-9 w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Geen ritten gevonden.</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const sv = statusVariant(r.status);
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                      {r.ride_number ?? `#${r.id.slice(0, 8).toUpperCase()}`}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums whitespace-nowrap py-2">{fmt(r.scheduled_at)}</TableCell>
                    <TableCell className="text-xs py-2 max-w-[160px] truncate">{r.client_name ?? "—"}</TableCell>
                    <TableCell className="text-xs py-2">
                      <span className="font-medium">{r.pickup_city}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="font-medium">{r.dropoff_city}</span>
                    </TableCell>
                    <TableCell className="text-xs tabular-nums text-center py-2">
                      {r.assignment_count} / {r.num_escorts}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${sv.className}`}>
                        {sv.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Meer opties</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">{r.ride_number ?? r.id.slice(0, 8).toUpperCase()}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs">Status wijzigen</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {STATUSES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  className="text-xs"
                                  onClick={() => updateStatus(r.id, s)}
                                  disabled={s === r.status}
                                >
                                  {statusVariant(s).label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          {r.status !== "cancelled" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-xs text-destructive focus:text-destructive"
                                onClick={() => cancelRide(r.id)}
                              >
                                Rit annuleren
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminRides;
