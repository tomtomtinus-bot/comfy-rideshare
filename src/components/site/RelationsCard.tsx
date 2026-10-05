import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Users, X, Check, Euro } from "lucide-react";
import { RatesDialog } from "@/components/site/RatesDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Rel { id: string; other_id: string; name: string; email: string | null; status: string; incoming: boolean }

export const RelationsCard = ({ onChange }: { onChange?: () => void }) => {
  const { role } = useAuth();
  const isEscort = role === "begeleider";
  const [list, setList] = useState<Rel[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ratesFor, setRatesFor] = useState<Rel | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("list_relations");
    setList((data ?? []) as Rel[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const refresh = () => { load(); onChange?.(); };

  const add = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("add_relation", { _query: q });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(data === "exists" ? "Deze relatie bestaat al" : "Verzoek verstuurd");
    setQ("");
    refresh();
  };

  const respond = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc("respond_relation", { _id: id, _accept: accept });
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("relations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold tracking-tight">Vaste relaties</h2>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Voeg een {isEscort ? "transporteur/planner" : "transportbegeleider"} toe via e-mailadres of exacte bedrijfsnaam.
      </p>
      <div className="flex gap-2 mb-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e-mail of bedrijfsnaam" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} disabled={busy || q.trim().length < 3}><UserPlus className="h-4 w-4 mr-1" />Toevoegen</Button>
      </div>
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Nog geen relaties.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {list.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5 gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                {r.email && <div className="text-xs text-slate-500 truncate">{r.email}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.status === "pending" && r.incoming && (
                  <>
                    <Button size="sm" onClick={() => respond(r.id, true)}><Check className="h-4 w-4 mr-1" />Accepteren</Button>
                    <Button size="sm" variant="outline" onClick={() => respond(r.id, false)}>Weigeren</Button>
                  </>
                )}
                {r.status === "pending" && !r.incoming && <Badge variant="outline">Wacht op bevestiging</Badge>}
                {r.status === "accepted" && (
                  <Button size="sm" variant="outline" onClick={() => setRatesFor(r)}><Euro className="h-4 w-4 mr-1" />Tarieven</Button>
                )}
                {!(r.status === "pending" && r.incoming) && (
                  <Button size="icon" variant="ghost" aria-label="Verwijderen" onClick={() => remove(r.id)}><X className="h-4 w-4" /></Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <RatesDialog relation={ratesFor} editable={isEscort} onClose={() => setRatesFor(null)} />
    </Card>
  );
};
