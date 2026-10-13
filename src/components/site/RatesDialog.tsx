import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Euro } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Fields = { hourly: string; min: string };
const empty: Fields = { hourly: "", min: "" };
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));

export const RatesDialog = ({ relation, editable, onClose }: {
  relation: { id: string; name: string } | null; editable: boolean; onClose: () => void;
}) => {
  const { user } = useAuth();
  const [f, setF] = useState<Fields>(empty);
  const [isDefault, setIsDefault] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!relation) return;
    setF(empty); setIsDefault(false);
    (async () => {
      const { data } = await supabase.from("relation_rates").select("*").eq("relation_id", relation.id).maybeSingle();
      const s = (n: number | null | undefined) => (n ? String(n) : "");
      if (data && Number(data.hourly_rate) > 0) {
        const minAmt = Number((data as any).min_amount) || Number(data.min_hours) * Number(data.hourly_rate) || 0;
        setF({ hourly: s(data.hourly_rate), min: s(minAmt) });
        return;
      }
      if (!editable || !user) return;
      // Standaardtarief uit Instellingen
      const { data: p } = await supabase.from("escort_profiles").select("hourly_rate, min_billable_hours").eq("id", user.id).maybeSingle();
      if (!p) return;
      const h = Number(p.hourly_rate) || 0;
      setF({ hourly: s(h), min: s(Math.round(h * (Number(p.min_billable_hours) || 0) * 100) / 100) });
      setIsDefault(true);
    })();
  }, [relation, editable, user]);

  const save = async () => {
    if (!relation) return;
    const h = toNum(f.hourly), m = toNum(f.min);
    if (![h, m].every((v) => Number.isFinite(v) && v >= 0)) return toast.error("Vul geldige, positieve getallen in");
    setBusy(true);
    const { error } = await supabase.rpc("set_relation_rates_v2" as any, { _relation_id: relation.id, _hourly: h, _min_amount: m } as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tarieven opgeslagen");
    onClose();
  };

  const field = (label: string, k: keyof Fields, suffix: string) => (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input inputMode="decimal" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} disabled={!editable} className="pr-12" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={!!relation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Euro className="h-5 w-5" />Tarieven · {relation?.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500">
          {editable
            ? isDefault ? "Ingevuld met je standaardtarief uit Instellingen. Pas aan voor deze relatie en sla op." : "Vaste tariefafspraak binnen deze relatie."
            : "Tarieven zoals afgesproken met deze begeleider."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {field("Uurtarief", "hourly", "€/u")}
          {field("Minimumtarief", "min", "€")}
        </div>
        <p className="text-xs text-slate-500">Wachturen vallen onder het uurtarief. Toeslagen voegt de begeleider zelf toe op de ritbon.</p>
        {editable && <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};
