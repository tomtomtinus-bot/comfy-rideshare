import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Inv {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_amount: number;
  status: string;
  paid_at: string | null;
  escort_id: string;
  client_id: string;
  escort_name?: string;
  client_name?: string;
}

interface PInv {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  total_escorts: number;
  status: string;
  paid_at: string | null;
  client_id: string;
  client_name?: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });

const AdminInvoices = () => {
  const [tab, setTab] = useState<"escort" | "platform">("escort");
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [platform, setPlatform] = useState<PInv[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: invs }, { data: pinvs }] = await Promise.all([
      supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("platform_invoices").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    const userIds = [
      ...new Set([
        ...(invs ?? []).flatMap((i: any) => [i.escort_id, i.client_id]),
        ...(pinvs ?? []).map((p: any) => p.client_id),
      ]),
    ];
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, company_name").in("id", userIds)
      : { data: [] as any[] };
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p.company_name || p.full_name || "—"]));
    setInvoices(
      ((invs ?? []) as any[]).map((i) => ({
        ...i,
        escort_name: pMap.get(i.escort_id),
        client_name: pMap.get(i.client_id),
      })),
    );
    setPlatform(
      ((pinvs ?? []) as any[]).map((p) => ({ ...p, client_name: pMap.get(p.client_id) })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const togglePaid = async (table: "invoices" | "platform_invoices", id: string, paid: boolean) => {
    const upd = paid
      ? { status: "paid" as any, paid_at: new Date().toISOString() }
      : { status: "sent" as any, paid_at: null };
    const { error } = await supabase.from(table).update(upd).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(paid ? "Gemarkeerd als betaald" : "Markering teruggedraaid");
      load();
    }
  };

  const runGenerate = async (rpc: "generate_weekly_invoices" | "generate_platform_invoices") => {
    setGenerating(true);
    const { data, error } = await supabase.rpc(rpc);
    setGenerating(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`${data ?? 0} factu${(data ?? 0) === 1 ? "ur" : "ren"} gegenereerd`);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Facturen</h2>
        <p className="text-sm text-brass-deep/60 mt-1">Begeleiderfacturen en platformfacturen.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("escort")}
          className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold ${
            tab === "escort" ? "bg-brass-deep text-parchment" : "border border-brass-deep/20 text-brass-deep"
          }`}
        >
          Begeleider → opdrachtgever ({invoices.length})
        </button>
        <button
          onClick={() => setTab("platform")}
          className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold ${
            tab === "platform" ? "bg-brass-deep text-parchment" : "border border-brass-deep/20 text-brass-deep"
          }`}
        >
          Platform fee ({platform.length})
        </button>
        <div className="ml-auto">
          <button
            onClick={() =>
              runGenerate(tab === "escort" ? "generate_weekly_invoices" : "generate_platform_invoices")
            }
            disabled={generating}
            className="px-4 py-2 text-xs uppercase tracking-widest font-semibold bg-brass-gold text-parchment hover:bg-brass-deep disabled:opacity-50"
          >
            {generating ? "Bezig…" : "Genereer nu"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : tab === "escort" ? (
        invoices.length === 0 ? (
          <p className="text-sm text-brass-deep/50">Geen facturen.</p>
        ) : (
          <ul className="space-y-px bg-brass-deep/10">
            {invoices.map((i) => (
              <li key={i.id} className="bg-card p-4 md:p-5 grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 md:col-span-3">
                  <p className="font-mono text-sm">{i.invoice_number}</p>
                  <p className="text-[10px] text-brass-deep/55 mt-1">
                    {fmt(i.period_start)} – {fmt(i.period_end)}
                  </p>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <p className="text-sm">
                    <span className="text-brass-deep/55">Van:</span> {i.escort_name}
                  </p>
                  <p className="text-sm">
                    <span className="text-brass-deep/55">Aan:</span> {i.client_name}
                  </p>
                  <p className="text-[10px] text-brass-deep/55 mt-1 tabular-nums">
                    {Number(i.total_hours).toFixed(2)} uur
                  </p>
                </div>
                <div className="col-span-12 md:col-span-4 md:text-right space-y-2">
                  <p className="font-semibold tabular-nums text-brass-gold">
                    €{Number(i.total_amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/60">
                    {i.status}
                  </p>
                  <button
                    onClick={() => togglePaid("invoices", i.id, !i.paid_at)}
                    className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
                  >
                    {i.paid_at ? "Betaling intrekken" : "Markeer betaald"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : platform.length === 0 ? (
        <p className="text-sm text-brass-deep/50">Geen platformfacturen.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {platform.map((p) => (
            <li key={p.id} className="bg-card p-4 md:p-5 grid grid-cols-12 gap-3 items-start">
              <div className="col-span-12 md:col-span-3">
                <p className="font-mono text-sm">{p.invoice_number}</p>
                <p className="text-[10px] text-brass-deep/55 mt-1">
                  {fmt(p.period_start)} – {fmt(p.period_end)}
                </p>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-sm">
                  <span className="text-brass-deep/55">Aan:</span> {p.client_name}
                </p>
                <p className="text-[10px] text-brass-deep/55 mt-1">
                  {p.total_escorts} begeleider{p.total_escorts === 1 ? "" : "s"}
                </p>
              </div>
              <div className="col-span-12 md:col-span-4 md:text-right space-y-2">
                <p className="font-semibold tabular-nums text-brass-gold">
                  €{Number(p.total_amount).toFixed(2)}
                </p>
                <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/60">
                  {p.status}
                </p>
                <button
                  onClick={() => togglePaid("platform_invoices", p.id, !p.paid_at)}
                  className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
                >
                  {p.paid_at ? "Betaling intrekken" : "Markeer betaald"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminInvoices;
