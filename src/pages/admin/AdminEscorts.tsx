import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MoreHorizontal, Check } from "lucide-react";
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
  DropdownMenuCheckboxItem,
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

interface EscortRow {
  id: string;
  company_name: string | null;
  base_city: string;
  hourly_rate: number;
  rating: number;
  rides_completed: number;
  available: boolean;
  cert_expires_on: string | null;
  cert_number: string | null;
  vca_number: string | null;
  anonymous_id: string;
  countries: string[];
  cert_verified_countries: string[];
  languages: string[];
  full_name?: string;
}

const ALL_COUNTRIES = ["Nederland", "België", "Duitsland", "Frankrijk", "Luxemburg"] as const;
const COUNTRY_SHORT: Record<string, string> = {
  Nederland: "NL",
  België: "BE",
  Duitsland: "DE",
  Frankrijk: "FR",
  Luxemburg: "LU",
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const AdminEscorts = () => {
  const [list, setList] = useState<EscortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("escort_profiles")
      .select("id, company_name, base_city, hourly_rate, rating, rides_completed, available, cert_expires_on, cert_number, vca_number, anonymous_id, countries, cert_verified_countries, languages")
      .order("rating", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = (data ?? []).map((e: any) => e.id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as any[] };
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    setList(((data ?? []) as any[]).map((e) => ({ ...e, full_name: pMap.get(e.id) })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAvailable = async (id: string, available: boolean) => {
    const { error } = await supabase.from("escort_profiles").update({ available }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(available ? "Begeleider geactiveerd" : "Begeleider gedeactiveerd");
      load();
    }
  };

  const toggleCertCountry = async (escort: EscortRow, country: string) => {
    const current = escort.cert_verified_countries ?? [];
    const next = current.includes(country)
      ? current.filter((c) => c !== country)
      : [...current, country];
    setList((l) => l.map((e) => (e.id === escort.id ? { ...e, cert_verified_countries: next } : e)));
    const { error } = await supabase.rpc("admin_set_cert_verified_countries", {
      _escort_id: escort.id,
      _countries: next,
    });
    if (error) {
      toast.error(error.message);
      load();
    } else {
      toast.success(`${country}: ${next.includes(country) ? "geverifieerd" : "verificatie ingetrokken"}`);
    }
  };

  const expired = (d: string | null) => !!d && new Date(d) < new Date();

  const filtered = list.filter((e) => {
    if (filter === "available" && !e.available) return false;
    if (filter === "inactive" && e.available) return false;
    if (filter === "expired" && !expired(e.cert_expires_on)) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (e.full_name ?? "").toLowerCase().includes(q) ||
      (e.company_name ?? "").toLowerCase().includes(q) ||
      e.base_city.toLowerCase().includes(q) ||
      e.anonymous_id.toLowerCase().includes(q) ||
      (e.cert_number ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Begeleiders</h2>
        <p className="text-sm text-brass-deep/80 mt-1">
          {filtered.length} profiel{filtered.length === 1 ? "" : "en"} · modereer beschikbaarheid en certificering per land.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle begeleiders</SelectItem>
            <SelectItem value="available">Beschikbaar</SelectItem>
            <SelectItem value="inactive">Inactief</SelectItem>
            <SelectItem value="expired">Certificaat verlopen</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, bedrijf, anoniem ID of standplaats…"
          className="flex-1 min-w-[240px] h-9"
        />
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Anoniem ID</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Standplaats</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold text-right">Tarief</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold text-right">Ritten · ★</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Certificaat</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Geverifieerd</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
              <TableHead className="h-9 w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">Geen begeleiders gevonden.</TableCell>
              </TableRow>
            ) : (
              filtered.map((e) => {
                const certExpired = expired(e.cert_expires_on);
                return (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold tabular-nums py-2">
                      #{e.anonymous_id}
                    </TableCell>
                    <TableCell className="text-xs py-2 max-w-[200px]">
                      <p className="font-medium truncate">{e.full_name || e.company_name || "—"}</p>
                      {e.company_name && e.full_name && (
                        <p className="text-[10px] text-muted-foreground truncate">{e.company_name}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2 whitespace-nowrap">{e.base_city}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right py-2">€{Number(e.hourly_rate).toFixed(2)}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right py-2 whitespace-nowrap">
                      {e.rides_completed} · ★ {Number(e.rating).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-xs py-2 whitespace-nowrap">
                      <span className="tabular-nums">{e.cert_number || "—"}</span>
                      {e.cert_expires_on && (
                        <span className={`block text-[10px] ${certExpired ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                          {certExpired ? "verlopen " : "t/m "}{fmtDate(e.cert_expires_on)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2">
                      <div className="flex gap-1">
                        {ALL_COUNTRIES.map((c) => {
                          const verified = (e.cert_verified_countries ?? []).includes(c);
                          const offers = (e.countries ?? []).includes(c);
                          return (
                            <span
                              key={c}
                              title={`${c}${verified ? " · geverifieerd" : offers ? " · aangeboden" : ""}`}
                              className={`inline-flex items-center justify-center w-6 h-5 text-[9px] font-bold rounded-sm border ${
                                verified
                                  ? "bg-brass-gold text-brass-deep border-brass-gold"
                                  : offers
                                    ? "bg-background text-foreground border-border"
                                    : "bg-background text-muted-foreground/50 border-border/50"
                              }`}
                            >
                              {COUNTRY_SHORT[c]}
                            </span>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold uppercase ${
                          e.available
                            ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200"
                            : "bg-muted text-muted-foreground hover:bg-muted border-border"
                        }`}
                      >
                        {e.available ? "actief" : "inactief"}
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
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs">#{e.anonymous_id}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild className="text-xs">
                            <Link to={`/admin/escorts/${e.id}`}>Bekijk gegevens</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-xs"
                            onClick={() => toggleAvailable(e.id, !e.available)}
                          >
                            {e.available ? "Deactiveer begeleider" : "Activeer begeleider"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs">Certificering per land</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {ALL_COUNTRIES.map((c) => (
                                <DropdownMenuCheckboxItem
                                  key={c}
                                  className="text-xs"
                                  checked={(e.cert_verified_countries ?? []).includes(c)}
                                  onCheckedChange={() => toggleCertCountry(e, c)}
                                  onSelect={(ev) => ev.preventDefault()}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    {(e.cert_verified_countries ?? []).includes(c) && <Check className="size-3" />}
                                    {c}
                                  </span>
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
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

export default AdminEscorts;
