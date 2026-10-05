import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Euro } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Fields = { hourly: string; km: string; min: string; waiting: string; night: string; weekend: string; holiday: string };
const empty: Fields = { hourly: "", km: "", min: "", waiting: "", night: "", weekend: "", holiday: "" };
const toNum = (s: string) => (s.trim() === "" ? 0 : Number(s.replace(",", ".")));

export const RatesDialog = ({ relation, editable, onClose }: {
  relation: { id: string; name: string } | null; editable: boolean; onClose: () => void;
}) => {
  const [f, setF] = useState<Fields>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!relation) return;
    setF(empty);
    supabase.from("relation_rates").select("*").eq("relation_id", relation.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const s = (n: number | null) => (n ? String(n) : "");
      setF({ hourly: s(data.hourly_rate), km: s(data.km_rate), min: s(data.min_hours), waiting: s(data.waiting_rate),
        night: s(data.night_pct), weekend: s(data.weekend_pct), holiday: s(data.holiday_pct) });
    });
  }, [relation]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!relation) return;
    const vals = Object.values(f).map(toNum);
    if (vals.some((v) => !Number.isFinite(v) || v < 0)) return toast.error("Vul geldige, positieve getallen in");
    setBusy(true);
    const { error } = await supabase.rpc("set_relation_rates", {
      _relation_id: relation.id, _hourly: toNum(f.hourly), _km: toNum(f.km), _min_hours: toNum(f.min), _waiting: toNum(f.waiting),
      _night_pct: toNum(f.night), _weekend_pct: toNum(f.weekend), _holiday_pct: toNum(f.holiday),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tarieven opgeslagen");
    onClose();
  };

  const field = (label: string, k: keyof Fields, suffix: string) => (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <Input inputMode="decimal" value={f[k]} onChange={set(k)} disabled={!editable} className="pr-12" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={!!relation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Euro className="h-5 w-5" />Tarieven · {relation?.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-500">
          {editable ? "Standaardtarieven voor ritten met deze klant. Een tarief dat bij een rit zelf is ingevuld gaat voor." : "Tarieven zoals afgesproken met deze begeleider."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {field("Uurtarief", "hourly", "€/u")}
          {field("Kilometertarief", "km", "€/km")}
          {field("Minimuminzet", "min", "uur")}
          {field("Wachturentarief", "waiting", "€/u")}
        </div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 pt-2">Toeslagen op uren</p>
        <div className="grid grid-cols-3 gap-3">
          {field("Nacht", "night", "%")}
          {field("Weekend", "weekend", "%")}
          {field("Feestdag", "holiday", "%")}
        </div>
        <p className="text-xs text-slate-500">Nacht = start tussen 22:00 en 06:00. Bij meerdere toeslagen geldt de hoogste. Feestdagen volgens de Nederlandse kalender.</p>
        {editable && <DialogFooter><Button onClick={save} disabled={busy}>{busy ? "Opslaan…" : "Opslaan"}</Button></DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};
