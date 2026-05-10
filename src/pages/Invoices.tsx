import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { downloadEscortInvoicePdf, downloadPlatformInvoicePdf, vatRateFor, type BillingParty } from "@/lib/invoicePdf";

interface PlatformInvoice {
  id: string;
  client_id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  total_escorts: number;
  total_amount: number;
  status: "open" | "paid";
  paid_at: string | null;
  created_at: string;
}

interface PlatformItem {
  id: string;
  platform_invoice_id: string;
  ride_id: string | null;
  ride_date: string;
  route: string | null;
  num_escorts: number;
  amount: number;
  reference?: string | null;
}

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
  ride_id: string | null;
  ride_date: string;
  hours: number;
  hourly_rate: number;
  amount: number;
  description: string | null;
  reference?: string | null;
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { dateStyle: "medium" });
const fmtMoney = (n: number) => `€${Number(n).toFixed(2)}`;

const InvoicesInner = () => {
  const { user, role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([]);
  const [platformItems, setPlatformItems] = useState<Record<string, PlatformItem[]>>({});
  const [billingFrequency, setBillingFrequency] = useState<"weekly" | "monthly">("monthly");
  const [wero, setWero] = useState<{ enabled: boolean; handle: string | null; fee: number }>({ enabled: false, handle: null, fee: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [openPlat, setOpenPlat] = useState<string | null>(null);

  const isEscort = role === "begeleider";

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
      const itList = (it ?? []) as Item[];
      const rideIds = [...new Set(itList.map((r) => r.ride_id).filter(Boolean) as string[])];
      const refMap = new Map<string, string | null>();
      if (rideIds.length) {
        const { data: rs } = await supabase
          .from("rides")
          .select("id, client_reference")
          .in("id", rideIds);
        (rs ?? []).forEach((r: { id: string; client_reference: string | null }) => refMap.set(r.id, r.client_reference));
      }
      const grouped: Record<string, Item[]> = {};
      itList.forEach((row) => {
        row.reference = row.ride_id ? refMap.get(row.ride_id) ?? null : null;
        (grouped[row.invoice_id] ||= []).push(row);
      });
      setItems(grouped);
    }

    if (!isEscort) {
      const { data: plat } = await supabase
        .from("platform_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      const platList = (plat ?? []) as PlatformInvoice[];
      setPlatformInvoices(platList);
      if (platList.length) {
        const { data: pit } = await supabase
          .from("platform_invoice_items")
          .select("*")
          .in("platform_invoice_id", platList.map((i) => i.id));
        const pitList = (pit ?? []) as PlatformItem[];
        const pRideIds = [...new Set(pitList.map((r) => r.ride_id).filter(Boolean) as string[])];
        const pRefMap = new Map<string, string | null>();
        if (pRideIds.length) {
          const { data: rs } = await supabase
            .from("rides")
            .select("id, client_reference")
            .in("id", pRideIds);
          (rs ?? []).forEach((r: { id: string; client_reference: string | null }) => pRefMap.set(r.id, r.client_reference));
        }
        const pg: Record<string, PlatformItem[]> = {};
        pitList.forEach((row) => {
          row.reference = row.ride_id ? pRefMap.get(row.ride_id) ?? null : null;
          (pg[row.platform_invoice_id] ||= []).push(row);
        });
        setPlatformItems(pg);
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("billing_frequency")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.billing_frequency) setBillingFrequency(prof.billing_frequency as "weekly" | "monthly");
    }

    if (isEscort) {
      const { data: ep } = await supabase
        .from("escort_profiles")
        .select("wero_enabled, wero_handle, wero_fee")
        .eq("id", user.id)
        .maybeSingle();
      if (ep) setWero({ enabled: !!ep.wero_enabled, handle: ep.wero_handle ?? null, fee: Number(ep.wero_fee || 0) });
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateFrequency = async (freq: "weekly" | "monthly") => {
    if (!user) return;
    setBillingFrequency(freq);
    const { error } = await supabase
      .from("profiles")
      .update({ billing_frequency: freq })
      .eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success(`Factureringsfrequentie: ${freq === "weekly" ? "wekelijks" : "maandelijks"}`);
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

  const markPlatformPaid = async (id: string) => {
    const { error } = await supabase
      .from("platform_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Gemarkeerd als betaald");
    load();
  };

  const fetchClientParty = async (id: string): Promise<BillingParty> => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, company_name, billing_contact_name, billing_email, billing_address, billing_postcode, billing_city, billing_country, kvk_number, vat_number")
      .eq("id", id)
      .maybeSingle();
    return (data ?? {}) as BillingParty;
  };

  const fetchEscortParty = async (id: string): Promise<BillingParty> => {
    const [{ data: prof }, { data: ep }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
      supabase
        .from("escort_profiles")
        .select("company_name, billing_contact_name, billing_email, billing_address, billing_postcode, billing_city, billing_country, kvk_number, vat_number, iban, bank_account_holder, wero_enabled, wero_handle, wero_fee")
        .eq("id", id)
        .maybeSingle(),
    ]);
    return { ...(prof ?? {}), ...(ep ?? {}) } as BillingParty;
  };

  const PLATFORM_PARTY: BillingParty = {
    company_name: "Lowloads B.V.",
    billing_address: "Mediavaert 1",
    billing_postcode: "1114 BC",
    billing_city: "Amsterdam-Duivendrecht",
    billing_country: "Nederland",
    kvk_number: "00000000",
    vat_number: "NL000000000B01",
    billing_email: "facturatie@lowloads.app",
  };

  const downloadEscortPdf = async (inv: Invoice) => {
    try {
      const [from, to] = await Promise.all([fetchEscortParty(inv.escort_id), fetchClientParty(inv.client_id)]);
      downloadEscortInvoicePdf({
        invoice_number: inv.invoice_number,
        created_at: inv.created_at,
        period_start: inv.period_start,
        period_end: inv.period_end,
        from,
        to,
        rows: items[inv.id] ?? [],
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const downloadPlatformPdf = async (inv: PlatformInvoice) => {
    try {
      const to = await fetchClientParty(inv.client_id);
      downloadPlatformInvoicePdf({
        invoice_number: inv.invoice_number,
        created_at: inv.created_at,
        period_start: inv.period_start,
        period_end: inv.period_end,
        from: PLATFORM_PARTY,
        to,
        rows: platformItems[inv.id] ?? [],
        total_amount: inv.total_amount,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

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
                Facturen worden automatisch aangemaakt op basis van ingediende uren en geboekte ritten.
              </p>
            </div>
          </header>

          {!isEscort && (
            <Tabs defaultValue="begeleiders" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="begeleiders">Begeleiders ({invoices.length})</TabsTrigger>
                <TabsTrigger value="platform">App-fee ({platformInvoices.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="begeleiders">
                {renderEscortInvoices()}
              </TabsContent>

              <TabsContent value="platform" className="space-y-6">
                <div className="bg-card shadow-etched p-6 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Factureringsfrequentie</p>
                    <p className="text-sm text-brass-deep/70">App-fee is 1,5% van de afgeronde ritbedragen, automatisch wekelijks gefactureerd.</p>
                  </div>
                  <div className="flex gap-2">
                    {(["weekly", "monthly"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => updateFrequency(f)}
                        className={`px-4 py-2 text-xs uppercase tracking-widest font-semibold transition-colors ${
                          billingFrequency === f
                            ? "bg-brass-deep text-parchment"
                            : "bg-brass-deep/10 text-brass-deep hover:bg-brass-deep/20"
                        }`}
                      >
                        {f === "weekly" ? "Wekelijks" : "Maandelijks"}
                      </button>
                    ))}
                  </div>
                </div>
                {renderPlatformInvoices()}
              </TabsContent>
            </Tabs>
          )}

          {isEscort && renderEscortInvoices()}
        </div>
      </main>
      <Footer />
    </div>
  );

  function renderPlatformInvoices() {
    if (loading) return <p className="text-sm text-brass-deep/50">Laden…</p>;
    if (platformInvoices.length === 0)
      return (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60">Nog geen platform-facturen.</p>
        </div>
      );
    return (
      <ul className="space-y-px bg-brass-deep/10">
        {platformInvoices.map((inv) => {
          const isOpen = openPlat === inv.id;
          const rows = platformItems[inv.id] ?? [];
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
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">Begeleiders</p>
                  <p className="font-semibold tabular-nums">{inv.total_escorts}</p>
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
                  onClick={() => setOpenPlat(isOpen ? null : inv.id)}
                  className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                >
                  {isOpen ? "Verberg regels" : "Toon regels"}
                </button>
                <button
                  onClick={() => downloadPlatformPdf(inv)}
                  className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                >
                  Download PDF
                </button>
                {inv.status !== "paid" && (
                  <button
                    onClick={() => markPlatformPaid(inv.id)}
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
                        <th className="text-left py-2">Route</th>
                        <th className="text-right py-2">Begeleiders</th>
                        <th className="text-right py-2">Bedrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-brass-deep/5">
                          <td className="py-2 tabular-nums">{fmtDate(r.ride_date)}</td>
                          <td className="py-2">{r.route}</td>
                          <td className="py-2 text-right tabular-nums">{r.num_escorts}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-brass-deep/30">
                        <td colSpan={3} className="py-3 text-right text-xs uppercase tracking-widest font-bold text-brass-deep">
                          Totaal
                        </td>
                        <td className="py-3 text-right tabular-nums font-bold text-brass-gold text-base">{fmtMoney(inv.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  function renderEscortInvoices() {
    if (loading) return <p className="text-sm text-brass-deep/50">Laden…</p>;
    if (invoices.length === 0)
      return (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60">Nog geen facturen.</p>
        </div>
      );
    return (
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
                      <button
                        onClick={() => downloadEscortPdf(inv)}
                        className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                      >
                        Download PDF
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

                    {isOpen && (() => {
                      const isFuel = (r: Item) =>
                        /brandstof|fuel/i.test(r.description ?? "");
                      const rideRows = rows.filter((r) => !isFuel(r));
                      const fuelRows = rows.filter((r) => isFuel(r));
                      const ridesSubtotal = rideRows.reduce((s, r) => s + Number(r.amount), 0);
                      const fuelSubtotal = fuelRows.reduce((s, r) => s + Number(r.amount), 0);
                      const subtotal = ridesSubtotal + fuelSubtotal;
                      const vat = subtotal * 0.21;
                      const weroFee = wero.enabled ? wero.fee : 0;
                      const total = subtotal + vat + weroFee;
                      return (
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
                              {rideRows.map((r) => (
                                <tr key={r.id} className="border-t border-brass-deep/5">
                                  <td className="py-2 tabular-nums">{fmtDate(r.ride_date)}</td>
                                  <td className="py-2">{r.description}</td>
                                  <td className="py-2 text-right tabular-nums">{Number(r.hours).toFixed(2)}</td>
                                  <td className="py-2 text-right tabular-nums">{fmtMoney(r.hourly_rate)}</td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-brass-deep/20">
                                <td colSpan={4} className="py-3 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  Subtotaal ritten
                                </td>
                                <td className="py-3 text-right tabular-nums font-semibold">{fmtMoney(ridesSubtotal)}</td>
                              </tr>

                              {fuelRows.length > 0 && fuelRows.map((r) => (
                                <tr key={r.id} className="border-t border-brass-deep/5">
                                  <td className="py-2 tabular-nums">{fmtDate(r.ride_date)}</td>
                                  <td className="py-2">{r.description}</td>
                                  <td className="py-2 text-right tabular-nums">{Number(r.hours).toFixed(2)}</td>
                                  <td className="py-2 text-right tabular-nums">{fmtMoney(r.hourly_rate)}</td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                                </tr>
                              ))}
                              {fuelRows.length > 0 && (
                                <tr className="border-t border-brass-deep/10">
                                  <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                    Brandstoftoeslag
                                  </td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(fuelSubtotal)}</td>
                                </tr>
                              )}

                              <tr className="border-t border-brass-deep/10">
                                <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  Subtotaal excl. btw
                                </td>
                                <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(subtotal)}</td>
                              </tr>
                              <tr>
                                <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  Btw 21%
                                </td>
                                <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(vat)}</td>
                              </tr>
                              {weroFee > 0 && (
                                <tr>
                                  <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                    Wero-betaaltoeslag
                                  </td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(weroFee)}</td>
                                </tr>
                              )}
                              <tr className="border-t-2 border-brass-deep/30">
                                <td colSpan={4} className="py-3 text-right text-xs uppercase tracking-widest font-bold text-brass-deep">
                                  Eindbedrag
                                </td>
                                <td className="py-3 text-right tabular-nums font-bold text-brass-gold text-base">{fmtMoney(total)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </li>
                );
              })}
            </ul>
    );
  }
};

const Invoices = () => (
  <RequireAuth>
    <InvoicesInner />
  </RequireAuth>
);

export default Invoices;
