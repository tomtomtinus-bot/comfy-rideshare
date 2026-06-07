import { useEffect, useMemo, useState } from "react";
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

const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

// ISO week number
const isoWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

type AnyInv = (Inv | PInv) & { escort_name?: string; client_name?: string };

const groupInvoices = <T extends AnyInv>(items: T[]) => {
  const tree: Record<string, Record<string, Record<string, T[]>>> = {};
  for (const inv of items) {
    const d = new Date(inv.period_start);
    const y = String(d.getFullYear());
    const m = MONTHS_NL[d.getMonth()];
    const w = `Week ${isoWeek(d)}`;
    tree[y] ??= {};
    tree[y][m] ??= {};
    tree[y][m][w] ??= [];
    tree[y][m][w].push(inv);
  }
  return tree;
};

const AdminInvoices = () => {
  const [tab, setTab] = useState<"escort" | "platform">("escort");
  const [invoices, setInvoices] = useState<Inv[]>([]);
  const [platform, setPlatform] = useState<PInv[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: invs }, { data: pinvs }] = await Promise.all([
      supabase.from("invoices").select("*").order("period_start", { ascending: false }).limit(2000),
      supabase.from("platform_invoices").select("*").order("period_start", { ascending: false }).limit(2000),
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

  const matches = (i: AnyInv) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [
        i.invoice_number,
        (i as Inv).escort_name,
        i.client_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (dateFrom) {
      if (new Date(i.period_end) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (new Date(i.period_start) > new Date(dateTo + "T23:59:59")) return false;
    }
    return true;
  };

  const filteredInvoices = useMemo(() => invoices.filter(matches), [invoices, search, dateFrom, dateTo]);
  const filteredPlatform = useMemo(() => platform.filter(matches), [platform, search, dateFrom, dateTo]);

  const groupedEscort = useMemo(() => groupInvoices(filteredInvoices), [filteredInvoices]);
  const groupedPlatform = useMemo(() => groupInvoices(filteredPlatform), [filteredPlatform]);

  const sortDesc = (a: string, b: string) => b.localeCompare(a, undefined, { numeric: true });
  const sortMonthDesc = (a: string, b: string) => MONTHS_NL.indexOf(b) - MONTHS_NL.indexOf(a);
  const sortWeekDesc = (a: string, b: string) =>
    parseInt(b.replace("Week ", ""), 10) - parseInt(a.replace("Week ", ""), 10);

  const renderEscortRow = (i: Inv) => (
    <li key={i.id} className="bg-card p-4 md:p-5 grid grid-cols-12 gap-3 items-start">
      <div className="col-span-12 md:col-span-3">
        <p className="font-mono text-sm">{i.invoice_number}</p>
        <p className="text-[10px] text-brass-deep/80 mt-1">
          {fmt(i.period_start)} – {fmt(i.period_end)}
        </p>
      </div>
      <div className="col-span-12 md:col-span-5">
        <p className="text-sm">
          <span className="text-brass-deep/80">Van:</span> {i.escort_name}
        </p>
        <p className="text-sm">
          <span className="text-brass-deep/80">Aan:</span> {i.client_name}
        </p>
        <p className="text-[10px] text-brass-deep/80 mt-1 tabular-nums">
          {Number(i.total_hours).toFixed(2)} uur
        </p>
      </div>
      <div className="col-span-12 md:col-span-4 md:text-right space-y-2">
        <p className="font-semibold tabular-nums text-brass-gold">
          €{Number(i.total_amount).toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/80">{i.status}</p>
        <button
          onClick={() => togglePaid("invoices", i.id, !i.paid_at)}
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
        >
          {i.paid_at ? "Betaling intrekken" : "Markeer betaald"}
        </button>
      </div>
    </li>
  );

  const renderPlatformRow = (p: PInv) => (
    <li key={p.id} className="bg-card p-4 md:p-5 grid grid-cols-12 gap-3 items-start">
      <div className="col-span-12 md:col-span-3">
        <p className="font-mono text-sm">{p.invoice_number}</p>
        <p className="text-[10px] text-brass-deep/80 mt-1">
          {fmt(p.period_start)} – {fmt(p.period_end)}
        </p>
      </div>
      <div className="col-span-12 md:col-span-5">
        <p className="text-sm">
          <span className="text-brass-deep/80">Aan:</span> {p.client_name}
        </p>
        <p className="text-[10px] text-brass-deep/80 mt-1">
          {p.total_escorts} begeleider{p.total_escorts === 1 ? "" : "s"}
        </p>
      </div>
      <div className="col-span-12 md:col-span-4 md:text-right space-y-2">
        <p className="font-semibold tabular-nums text-brass-gold">
          €{Number(p.total_amount).toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-widest font-bold text-brass-deep/80">{p.status}</p>
        <button
          onClick={() => togglePaid("platform_invoices", p.id, !p.paid_at)}
          className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
        >
          {p.paid_at ? "Betaling intrekken" : "Markeer betaald"}
        </button>
      </div>
    </li>
  );

  const renderGrouped = <T extends AnyInv>(
    grouped: Record<string, Record<string, Record<string, T[]>>>,
    renderRow: (i: T) => JSX.Element,
    emptyText: string,
  ) => {
    const years = Object.keys(grouped).sort(sortDesc);
    if (years.length === 0) return <p className="text-sm text-brass-deep/80">{emptyText}</p>;
    const anyFilter = search || dateFrom || dateTo;
    return (
      <div className="space-y-2">
        {years.map((y, yi) => {
          const months = Object.keys(grouped[y]).sort(sortMonthDesc);
          const yearCount = months.reduce(
            (sum, m) => sum + Object.values(grouped[y][m]).reduce((s, arr) => s + arr.length, 0),
            0,
          );
          return (
            <details
              key={y}
              open={!!anyFilter || yi === 0}
              className="group border border-brass-deep/15 bg-card"
            >
              <summary className="flex items-center justify-between cursor-pointer select-none px-4 py-3 hover:bg-parchment/40">
                <span className="font-display text-lg text-brass-deep">{y}</span>
                <span className="text-[10px] uppercase tracking-widest text-brass-deep/80">
                  {yearCount} factu{yearCount === 1 ? "ur" : "ren"}{" "}
                  <span className="ml-2 inline-block transition-transform group-open:rotate-180">▼</span>
                </span>
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {months.map((m) => {
                  const weeks = Object.keys(grouped[y][m]).sort(sortWeekDesc);
                  const monthCount = weeks.reduce((s, w) => s + grouped[y][m][w].length, 0);
                  return (
                    <details
                      key={m}
                      open={!!anyFilter}
                      className="group/m border border-brass-deep/10 bg-parchment/30"
                    >
                      <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2 hover:bg-parchment/60">
                        <span className="text-sm font-semibold text-brass-deep">{m}</span>
                        <span className="text-[10px] uppercase tracking-widest text-brass-deep/80">
                          {monthCount}{" "}
                          <span className="ml-2 inline-block transition-transform group-open/m:rotate-180">
                            ▼
                          </span>
                        </span>
                      </summary>
                      <div className="px-2 pb-2 space-y-2">
                        {weeks.map((w) => (
                          <details
                            key={w}
                            open={!!anyFilter}
                            className="group/w border border-brass-deep/10 bg-card"
                          >
                            <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2 hover:bg-parchment/40">
                              <span className="text-xs uppercase tracking-widest font-semibold text-brass-deep/80">
                                {w}
                              </span>
                              <span className="text-[10px] uppercase tracking-widest text-brass-deep/80">
                                {grouped[y][m][w].length}{" "}
                                <span className="ml-2 inline-block transition-transform group-open/w:rotate-180">
                                  ▼
                                </span>
                              </span>
                            </summary>
                            <ul className="space-y-px bg-brass-deep/10">
                              {grouped[y][m][w].map(renderRow)}
                            </ul>
                          </details>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Facturen</h2>
        <p className="text-sm text-brass-deep/80 mt-1">Begeleiderfacturen en platformfacturen.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTab("escort")}
          className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold ${
            tab === "escort" ? "bg-brass-deep text-parchment" : "border border-brass-deep/20 text-brass-deep"
          }`}
        >
          Begeleider → opdrachtgever ({filteredInvoices.length}/{invoices.length})
        </button>
        <button
          onClick={() => setTab("platform")}
          className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold ${
            tab === "platform" ? "bg-brass-deep text-parchment" : "border border-brass-deep/20 text-brass-deep"
          }`}
        >
          Platform fee ({filteredPlatform.length}/{platform.length})
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border border-brass-deep/15 bg-parchment/30">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-semibold text-brass-deep/80 mb-1">
            Zoek op naam of factuurnr.
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Begeleider, opdrachtgever…"
            className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-card focus:outline-none focus:border-brass-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-semibold text-brass-deep/80 mb-1">
            Datum van
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-card focus:outline-none focus:border-brass-deep"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-semibold text-brass-deep/80 mb-1">
            Datum tot
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-card focus:outline-none focus:border-brass-deep"
          />
        </div>
        {(search || dateFrom || dateTo) && (
          <div className="md:col-span-3">
            <button
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-[10px] uppercase tracking-widest font-semibold text-brass-deep/70 hover:text-brass-deep underline"
            >
              Filters wissen
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : tab === "escort" ? (
        renderGrouped(groupedEscort, renderEscortRow, "Geen facturen.")
      ) : (
        renderGrouped(groupedPlatform, renderPlatformRow, "Geen platformfacturen.")
      )}
    </div>
  );
};

export default AdminInvoices;
