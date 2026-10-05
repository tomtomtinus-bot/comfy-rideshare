export interface Breakdown {
  hours: number;
  billable_hours: number;
  min_hours: number;
  hourly_rate: number;
  hours_amount: number;
  fixed_amount: number;
  km: number;
  km_rate: number;
  km_amount: number;
  waiting_hours: number;
  waiting_rate: number;
  waiting_amount: number;
  surcharge_label: string | null;
  surcharge_pct: number;
  surcharge_amount: number;
  expenses: { description?: string; amount: number }[];
  expenses_amount: number;
  correction: number;
  correction_note?: string | null;
  subtotal: number;
  rates_source: "relation" | "default";
}

const eur = (n: number) => new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(Number(n) || 0);
const n2 = (n: number) => new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(Number(n) || 0);

const Line = ({ label, calc, amount }: { label: string; calc?: string; amount: number }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 text-sm">
    <div>
      <span>{label}</span>
      {calc && <span className="text-slate-500 ml-2 text-xs">{calc}</span>}
    </div>
    <span className="tabular-nums">{eur(amount)}</span>
  </div>
);

export const BreakdownView = ({ b }: { b: Breakdown }) => (
  <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1">Berekening</p>
    {Number(b.fixed_amount) > 0 ? (
      <Line label="Vaste prijs" amount={b.fixed_amount} />
    ) : (
      <Line
        label="Uren"
        calc={`${n2(b.billable_hours)} u × ${eur(b.hourly_rate)}${Number(b.billable_hours) > Number(b.hours) ? ` (min. ${n2(b.min_hours)} u)` : ""}`}
        amount={b.hours_amount}
      />
    )}
    {Number(b.km) > 0 && <Line label="Kilometers" calc={`${n2(b.km)} km × ${eur(b.km_rate)}`} amount={b.km_amount} />}
    {Number(b.waiting_hours) > 0 && <Line label="Wachturen" calc={`${n2(b.waiting_hours)} u × ${eur(b.waiting_rate)}`} amount={b.waiting_amount} />}
    {Number(b.surcharge_amount) > 0 && <Line label={b.surcharge_label ?? "Toeslag"} calc={`${n2(b.surcharge_pct)}%`} amount={b.surcharge_amount} />}
    {(b.expenses ?? []).map((e, i) => <Line key={i} label={e.description || "Onkosten"} amount={e.amount} />)}
    {Number(b.correction) !== 0 && <Line label="Correctie" calc={b.correction_note ?? undefined} amount={b.correction} />}
    <div className="flex justify-between pt-2 font-semibold text-sm">
      <span>Subtotaal excl. btw</span>
      <span className="tabular-nums">{eur(b.subtotal)}</span>
    </div>
    {b.rates_source === "default" && (
      <p className="text-xs text-slate-500 mt-2">Er zijn nog geen klanttarieven ingesteld; het standaard uurtarief is gebruikt.</p>
    )}
  </div>
);
