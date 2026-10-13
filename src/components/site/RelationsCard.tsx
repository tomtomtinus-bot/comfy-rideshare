import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Check, Euro, Plus, Search, MoreHorizontal, Trash2, Phone, Mail } from "lucide-react";
import { RatesDialog } from "@/components/site/RatesDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Rel {
  id: string; other_id: string; name: string; contact: string | null; email: string | null; phone: string | null;
  status: string; incoming: boolean; created_at: string;
  hourly_rate: number | null; km_rate: number | null; min_hours: number | null;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const letterOf = (s: string) => {
  const c = s.trim().charAt(0).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /[A-Z]/.test(c) ? c : "#";
};
const eur = (n: number) => `€ ${n.toLocaleString("nl-NL", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}${n % 1 ? "" : ",-"}`;
const rateSummary = (r: Rel) => {
  const parts: string[] = [];
  if (r.hourly_rate) parts.push(`${eur(Number(r.hourly_rate))}/u`);
  if (r.km_rate) parts.push(`${eur(Number(r.km_rate))}/km`);
  if (r.min_hours) parts.push(`min. ${Number(r.min_hours)} u`);
  return parts.join(" • ");
};
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));

export const RelationsCard = ({ onChange, pageTitle }: { onChange?: () => void; pageTitle?: string }) => {
  const { role } = useAuth();
  const isEscort = role === "begeleider";
  const [list, setList] = useState<Rel[]>([]);
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [ratesFor, setRatesFor] = useState<Rel | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("list_relations_v2");
    setList((data ?? []) as Rel[]);
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = () => { load(); onChange?.(); };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc("respond_relation", { _id: id, _accept: accept });
    if (error) return toast.error(error.message);
    refresh();
  };
  const remove = async (r: Rel) => {
    if (!confirm(`Relatie met ${r.name} ontkoppelen?`)) return;
    const { error } = await supabase.from("relations").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Relatie ontkoppeld");
    refresh();
  };

  const sorted = useMemo(() => [...list].sort((a, b) => a.name.localeCompare(b.name, "nl", { sensitivity: "base" })), [list]);
  const available = useMemo(() => new Set(sorted.map((r) => letterOf(r.name))), [sorted]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter((r) => {
      if (letter && letterOf(r.name) !== letter) return false;
      if (!q) return true;
      return [r.name, r.contact, r.email, r.phone].some((v) => v?.toLowerCase().includes(q));
    });
  }, [sorted, search, letter]);
  const groups = useMemo(() => {
    const m = new Map<string, Rel[]>();
    filtered.forEach((r) => { const l = letterOf(r.name); m.set(l, [...(m.get(l) ?? []), r]); });
    return [...m.entries()];
  }, [filtered]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {pageTitle
              ? <h1 className="text-xl font-semibold tracking-tight">{pageTitle} ({list.length})</h1>
              : <><h2 className="text-lg font-semibold tracking-tight">Vaste relaties</h2><span className="text-xs text-slate-500">({list.length})</span></>}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Je vaste {isEscort ? "transporteurs/planners" : "transportbegeleiders"} en hun tariefafspraken.</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Nieuwe relatie toevoegen</Button>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Zoek op bedrijfsnaam, contactpersoon of e-mail" className="pl-8 h-8 text-sm" />
      </div>
      <div className="flex flex-wrap gap-0.5 mb-3 text-xs">
        <button onClick={() => setLetter(null)} className={cn("px-1.5 py-0.5 rounded font-medium", !letter ? "bg-primary text-primary-foreground" : "text-slate-600 hover:bg-slate-100")}>Alle</button>
        {LETTERS.map((l) => (
          <button key={l} disabled={!available.has(l)} onClick={() => setLetter(l === letter ? null : l)}
            className={cn("w-5 py-0.5 rounded font-medium", letter === l ? "bg-primary text-primary-foreground" : available.has(l) ? "text-slate-700 hover:bg-slate-100" : "text-slate-300 cursor-default")}>
            {l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 py-4">{list.length === 0 ? "Nog geen relaties." : "Geen relaties gevonden."}</p>
      ) : (
        <div className="max-h-[calc(100vh-16rem)] overflow-y-auto -mx-1 px-1">
          {groups.map(([l, rows]) => (
            <div key={l}>
              <div className="sticky top-0 z-10 bg-card text-[11px] font-semibold text-slate-500 border-b border-slate-100 py-0.5">{l}</div>
              <ul className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const rates = rateSummary(r);
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-1 text-sm">
                      <div className="min-w-0 flex-1 grid sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,0.9fr)] gap-x-3 items-center">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          {rates ? <div className="text-[11px] text-slate-500 truncate">{rates}</div>
                            : r.status === "accepted" && <div className="text-[11px] text-slate-400">Geen tarief ingesteld</div>}
                        </div>
                        <div className="min-w-0 text-xs text-slate-600">
                          {r.contact && <div className="truncate">{r.contact}</div>}
                          {r.email && <div className="truncate flex items-center gap-1 text-slate-500"><Mail className="h-3 w-3 shrink-0" />{r.email}</div>}
                        </div>
                        <div className="min-w-0 text-xs text-slate-500 truncate">
                          {r.phone && <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-primary"><Phone className="h-3 w-3" />{r.phone}</a>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {r.status === "pending" && r.incoming && (
                          <>
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => respond(r.id, true)}><Check className="h-3.5 w-3.5 mr-1" />Accepteren</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => respond(r.id, false)}>Weigeren</Button>
                          </>
                        )}
                        {r.status === "pending" && !r.incoming && <Badge variant="outline" className="text-[11px] font-normal">Wacht op bevestiging</Badge>}
                        {r.status === "accepted" && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[11px] text-slate-600" onClick={() => setRatesFor(r)}><Euro className="h-3 w-3 mr-0.5" />{isEscort ? "Tarieven" : "Tarieven"}</Button>
                        )}
                        {!(r.status === "pending" && r.incoming) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Opties"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => remove(r)}>
                                <Trash2 className="h-4 w-4 mr-2" />{r.status === "pending" ? "Verzoek intrekken" : "Ontkoppelen"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
      <RatesDialog relation={ratesFor} editable={isEscort} onClose={() => { setRatesFor(null); load(); }} />
      <AddRelationDialog open={addOpen} isEscort={isEscort} onClose={() => setAddOpen(false)} onDone={refresh} />
    </Card>
  );
};

const AddRelationDialog = ({ open, isEscort, onClose, onDone }: { open: boolean; isEscort: boolean; onClose: () => void; onDone: () => void }) => {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [r, setR] = useState({ hourly: "", km: "", min: "", waiting: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setCompany(""); setEmail(""); setR({ hourly: "", km: "", min: "", waiting: "" }); } }, [open]);

  const save = async () => {
    const vals = Object.values(r).map(toNum);
    if (vals.some((v) => !Number.isFinite(v) || v < 0)) return toast.error("Vul geldige, positieve tarieven in");
    const query = email.trim() || company.trim();
    if (query.length < 3) return toast.error("Vul een e-mailadres of bedrijfsnaam in");
    setBusy(true);
    const { data, error } = await supabase.rpc("add_relation", { _query: query });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (vals.some((v) => v > 0)) {
      const { data: rels } = await supabase.rpc("list_relations_v2");
      const q = query.toLowerCase();
      const all = ((rels ?? []) as Rel[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
      const match = data === "requested"
        ? all.find((x) => !x.incoming && x.status === "pending")
        : all.find((x) => x.email?.toLowerCase() === q || x.name.toLowerCase() === q || x.name.toLowerCase() === company.trim().toLowerCase());
      if (match) {
        const { error: e2 } = await supabase.rpc("set_relation_rates", {
          _relation_id: match.id, _hourly: toNum(r.hourly), _km: toNum(r.km), _min_hours: toNum(r.min), _waiting: toNum(r.waiting),
          _night_pct: 0, _weekend_pct: 0, _holiday_pct: 0,
        });
        if (e2) toast.error(`Relatie toegevoegd, tarieven niet opgeslagen: ${e2.message}`);
      }
    }
    setBusy(false);
    toast.success(data === "exists" ? "Deze relatie bestaat al" : "Verzoek verstuurd");
    onDone();
    onClose();
  };

  const rf = (label: string, k: keyof typeof r, suffix: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input inputMode="decimal" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} className="pr-12 h-9" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nieuwe relatie toevoegen</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500">Zoek een bestaand {isEscort ? "planner" : "begeleider"}account op e-mailadres of exacte bedrijfsnaam. Diegene krijgt een verzoek om te bevestigen.</p>
        <div className="space-y-3">
          <div><Label className="text-xs">Bedrijfsnaam</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs">E-mailadres</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" /></div>
        </div>
        {isEscort ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 pt-1">Vaste tariefafspraken (optioneel)</p>
            <div className="grid grid-cols-2 gap-3">
              {rf("Uurtarief", "hourly", "€/u")}
              {rf("Kilometertarief", "km", "€/km")}
              {rf("Minimuminzet", "min", "uur")}
              {rf("Wachturentarief", "waiting", "€/u")}
            </div>
            <p className="text-xs text-slate-500">Toeslagen voor nacht, weekend en feestdag stel je later in via "Tarieven bewerken".</p>
          </>
        ) : (
          <p className="text-xs text-slate-500">Tarieven stelt de begeleider in; jij kunt ze daarna alleen bekijken.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuleren</Button>
          <Button onClick={save} disabled={busy || (email.trim() || company.trim()).length < 3}>{busy ? "Opslaan…" : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
