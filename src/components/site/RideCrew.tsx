import { useEffect, useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ESCORT_ROLES = ["V1 – Voorwagen", "V2 – Achterwagen", "V3", "V4"];
export interface CrewMember { id: string; role: string }

interface Conflict { escortId: string; label: string; at: string }

const fmt = (d: string) => new Date(d).toLocaleString("nl-NL", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Looks up overlapping planned rides for each escort around `at`. */
export const useConflicts = (escortIds: string[], at: string | null, excludeRide?: string) => {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const key = escortIds.join(",");
  useEffect(() => {
    if (!at || !escortIds.length) { setConflicts([]); return; }
    let live = true;
    (async () => {
      const out: Conflict[] = [];
      for (const id of escortIds) {
        const { data } = await supabase.rpc("check_escort_conflicts", { _escort_id: id, _at: at, _exclude_ride: excludeRide ?? null } as any);
        (data ?? []).forEach((c: any) => out.push({ escortId: id, label: c.ride_label, at: c.scheduled_at }));
      }
      if (live) setConflicts(out);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, at, excludeRide]);
  return conflicts;
};

export const ConflictBanner = ({ conflicts, names }: { conflicts: Conflict[]; names: Map<string, string> }) => {
  if (!conflicts.length) return null;
  return (
    <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4 text-warning" />Let op: dubbele boeking</p>
      <ul className="mt-1 space-y-0.5 text-xs">
        {conflicts.map((c, i) => (
          <li key={i}>{names.get(c.escortId) ?? "Begeleider"} is al ingepland: {c.label} ({fmt(c.at)})</li>
        ))}
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">Je kunt de rit wel opslaan.</p>
    </div>
  );
};

export const CrewEditor = ({ crew, onChange, options }: {
  crew: CrewMember[]; onChange: (c: CrewMember[]) => void; options: { id: string; label: string }[];
}) => {
  const upd = (i: number, p: Partial<CrewMember>) => onChange(crew.map((m, j) => (j === i ? { ...m, ...p } : m)));
  return (
    <div className="space-y-2">
      {crew.map((m, i) => (
        <div key={i} className="flex gap-2">
          <Select value={m.role} onValueChange={(v) => upd(i, { role: v })}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>{ESCORT_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={m.id} onValueChange={(v) => upd(i, { id: v })}>
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nog niet toewijzen</SelectItem>
              {options.filter((o) => o.id === m.id || !crew.some((c) => c.id === o.id)).map((o) => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {crew.length > 1 && <Button type="button" size="icon" variant="ghost" onClick={() => onChange(crew.filter((_, j) => j !== i))} aria-label="Verwijderen"><X className="h-4 w-4" /></Button>}
        </div>
      ))}
      {crew.length < ESCORT_ROLES.length && (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...crew, { id: "none", role: ESCORT_ROLES[crew.length] }])}>
          <Plus className="h-4 w-4 mr-1" />Begeleider toevoegen
        </Button>
      )}
    </div>
  );
};
