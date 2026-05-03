import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";

interface Invoice {
  id: string;
  invoice_number: string;
  escort_id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  total_amount: number;
  status: "draft" | "sent" | "paid" | "cancelled";
  created_at: string;
  paid_at: string | null;
}

interface Item {
  id: string;
  invoice_id: string;
  ride_date: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  description: string | null;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { dateStyle: "medium" });
const fmtMoney = (n: number) => `€${Number(n).toFixed(2)}`;

const InvoicesInner = () => {
  const { user, role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: inv, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const list = (inv ?? []) as Invoice[];
    setInvoices(list);
    if (list.length) {
      const { data: it } = await supabase
        .from("invoice_items")
        .select("*")
        .in("invoice_id", list.map((i) => i.id));
      const grouped: Record<string, Item[]> = {};
      (it ?? []).forEach((row: Item) => {
        (grouped[row.invoice_id] ||= []).push(row);
      });
      setItems(grouped);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const generateNow = async () => {
    const { data, error } = await supabase.rpc("generate_weekly_invoices" as never);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} factuur/facturen aangemaakt`);
    load();
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gemarkeerd als betaald");
    load();
  };

  const isEscort = role === "begeleider";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
                {isEscort ? "Begeleider" : "Opdrachtgever"}
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">Facturen</h1>
              <p className="text-sm text-brass-deep/60 mt-3">
                Facturen worden automatisch elke maandagochtend aangemaakt op basis van ingediende uren van de afgelopen week.
              </p>
            </div>
            {isEscort && (
              <button
                onClick={generateNow}
                className="px-6 py-3 border border-brass-deep/30 text-brass-deep uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep hover:text-parchment transition-colors"
              >
                Nu factureren
              </button>
            )}
          </header>

          {loading ? (
            <p className="text-sm text-brass-deep/50">Laden…</p>
          ) : invoices.length === 0 ? (
            <div className="bg-card shadow-etched p-12 text-center">
              <p className="text-brass-deep/60">Nog geen facturen.</p>
            </div>
          ) : (
            <ul className="space-y-px bg-brass-deep/10">
              {invoices.map((inv) => {
                const isOpen = open === inv.id;
                const rows = items[inv.id] ?? [];
                return (
                  <li key={inv.id} className="bg-card p-6 md:p-8">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-3">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Factuur</p>
                        <p className="font-display text-xl text-brass-deep tabular-nums">{inv.invoice_number}</p>
                        <p className="text-xs text-brass-deep/55 mt-1">{fmtDate(inv.created_at)}</p>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Periode</p>
                        <p className="text-sm">{fmtDate(inv.period_start)} → {fmtDate(inv.period_end)}</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Uren</p>
                        <p className="font-semibold tabular-nums">{Number(inv.total_hours).toFixed(2)}u</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Totaal</p>
                        <p className="font-semibold tabular-nums text-brass-gold">{fmtMoney(inv.total_amount)}</p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-brass-gold">{inv.status}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setOpen(isOpen ? null : inv.id)}
                        className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                      >
                        {isOpen ? "Verberg regels" : "Toon regels"}
                      </button>
                      {!isEscort && inv.status !== "paid" && (
                        <button
                          onClick={() => markPaid(inv.id)}
                          className="ml-auto px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                        >
                          Markeer als betaald
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <div className="mt-6 pt-6 border-t border-brass-deep/10">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-brass-deep/50">
                              <th className="text-left py-2">Datum</th>
                              <th className="text-left py-2">Omschrijving</th>
                              <th className="text-right py-2">Uren</th>
                              <th className="text-right py-2">Tarief</th>
                              <th className="text-right py-2">Bedrag</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.id} className="border-t border-brass-deep/5">
                                <td className="py-2 tabular-nums">{fmtDate(r.ride_date)}</td>
                                <td className="py-2">{r.description}</td>
                                <td className="py-2 text-right tabular-nums">{Number(r.hours).toFixed(2)}</td>
                                <td className="py-2 text-right tabular-nums">{fmtMoney(r.hourly_rate)}</td>
                                <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const Invoices = () => (
  <RequireAuth>
    <InvoicesInner />
  </RequireAuth>
);

export default Invoices;
