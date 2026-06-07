import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Row {
  id: string;
  client_id: string;
  escort_id: string;
  reason: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  anonymous_id: string | null;
}

interface Escort {
  id: string;
  anonymous_id: string;
  base_city: string | null;
}

const fmtDate = (d: string) => {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const AdminExcluded = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [clients, setClients] = useState<Record<string, Profile>>({});
  const [escorts, setEscorts] = useState<Record<string, Escort>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: ex, error } = await supabase
      .from("client_excluded_escorts")
      .select("id, client_id, escort_id, reason, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (ex as Row[]) ?? [];
    setRows(list);

    const clientIds = Array.from(new Set(list.map((r) => r.client_id)));
    const escortIds = Array.from(new Set(list.map((r) => r.escort_id)));

    const [{ data: profs }, { data: esc }] = await Promise.all([
      clientIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name, company_name, anonymous_id")
            .in("id", clientIds)
        : Promise.resolve({ data: [] as Profile[] }),
      escortIds.length
        ? supabase
            .from("escort_profiles")
            .select("id, anonymous_id, base_city")
            .in("id", escortIds)
        : Promise.resolve({ data: [] as Escort[] }),
    ]);

    const cmap: Record<string, Profile> = {};
    ((profs as Profile[]) ?? []).forEach((p) => (cmap[p.id] = p));
    setClients(cmap);
    const emap: Record<string, Escort> = {};
    ((esc as Escort[]) ?? []).forEach((e) => (emap[e.id] = e));
    setEscorts(emap);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Deze uitsluiting verwijderen?")) return;
    const { error } = await supabase
      .from("client_excluded_escorts")
      .delete()
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Verwijderd");
      load();
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const c = clients[r.client_id];
    const e = escorts[r.escort_id];
    return (
      c?.full_name?.toLowerCase().includes(q) ||
      c?.company_name?.toLowerCase().includes(q) ||
      c?.anonymous_id?.toLowerCase().includes(q) ||
      e?.anonymous_id?.toLowerCase().includes(q) ||
      (r.reason ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl text-brass-deep flex items-center gap-2">
          <ShieldOff className="size-6" /> Uitgesloten begeleiders
        </h2>
        <p className="text-sm text-brass-deep/80 mt-1">
          {rows.length} uitsluiting{rows.length === 1 ? "" : "en"} verdeeld over{" "}
          {Object.keys(clients).length} opdrachtgever
          {Object.keys(clients).length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op opdrachtgever, bedrijf, begeleider-ID of reden…"
          className="flex-1 min-w-[240px] h-9"
        />
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Opdrachtgever</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Begeleider ID</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Standplaats</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Reden</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Datum</TableHead>
              <TableHead className="h-9 w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Geen uitsluitingen gevonden.</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const c = clients[r.client_id];
                const e = escorts[r.escort_id];
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs py-2 max-w-[200px]">
                      <p className="font-medium truncate">{c?.company_name || c?.full_name || "Onbekend"}</p>
                      {c?.anonymous_id && (
                        <p className="text-[10px] text-muted-foreground tabular-nums">#{c.anonymous_id}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                      #{e?.anonymous_id ?? "?"}
                    </TableCell>
                    <TableCell className="text-xs py-2 whitespace-nowrap">{e?.base_city ?? "—"}</TableCell>
                    <TableCell className="text-xs py-2 max-w-[260px] truncate">
                      {r.reason ? <span className="italic">&ldquo;{r.reason}&rdquo;</span> : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Meer opties</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-xs">
                            #{e?.anonymous_id ?? "?"} bij {c?.company_name || c?.full_name || "Onbekend"}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-xs text-destructive focus:text-destructive"
                            onClick={() => remove(r.id)}
                          >
                            Uitsluiting verwijderen
                          </DropdownMenuItem>
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

export default AdminExcluded;
