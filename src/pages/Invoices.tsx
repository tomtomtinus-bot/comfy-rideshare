import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { vatRateFor, type BillingParty } from "@/lib/invoicePdf";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

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

const fmtDate = (d: string, lng: string) =>
  new Date(d).toLocaleDateString(lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB", { dateStyle: "medium" });
const fmtMoney = (n: number) => `€${Number(n).toFixed(2)}`;

const MONTHS_NL = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];
const monthName = (idx: number, lng: string) => {
  const locale = lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB";
  const name = new Date(2000, idx, 1).toLocaleString(locale, { month: "long" });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const isoWeek = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

function groupByYMW<T extends { period_start: string }>(items: T[]) {
  const tree: Record<string, Record<string, Record<string, T[]>>> = {};
  for (const inv of items) {
    const d = new Date(inv.period_start);
    const y = String(d.getFullYear());
    const m = String(d.getMonth()).padStart(2, "0");
    const w = String(isoWeek(d)).padStart(2, "0");
    tree[y] ??= {};
    tree[y][m] ??= {};
    tree[y][m][w] ??= [];
    tree[y][m][w].push(inv);
  }
  return tree;
}

const sortYearDesc = (a: string, b: string) => b.localeCompare(a, undefined, { numeric: true });
const sortDescNum = (a: string, b: string) => parseInt(b, 10) - parseInt(a, 10);

const InvoicesInner = () => {
  const { user, role } = useAuth();
  const { t, i18n } = useTranslation();
  const fd = (d: string) => fmtDate(d, i18n.language);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [items, setItems] = useState<Record<string, Item[]>>({});
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([]);
  const [platformItems, setPlatformItems] = useState<Record<string, PlatformItem[]>>({});
  const [billingFrequency, setBillingFrequency] = useState<"weekly" | "monthly">("monthly");
  const [wero, setWero] = useState<{ enabled: boolean; handle: string | null; fee: number }>({ enabled: false, handle: null, fee: 0 });
  const [escortCountries, setEscortCountries] = useState<Record<string, string | null>>({});
  const [clientCountries, setClientCountries] = useState<Record<string, string | null>>({});
  const [escortNames, setEscortNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [openPlat, setOpenPlat] = useState<string | null>(null);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

    // Landen ophalen voor BTW-bepaling (verlegd bij verschillende landen)
    const escortIds = [...new Set(list.map((i) => i.escort_id))];
    const clientIds = [...new Set(list.map((i) => i.client_id))];
    if (escortIds.length) {
      const { data: ec } = await supabase
        .from("escort_profiles_public")
        .select("id, billing_country, company_name, anonymous_id")
        .in("id", escortIds);
      const cmap: Record<string, string | null> = {};
      const nmap: Record<string, string> = {};
      (ec ?? []).forEach((r: { id: string; billing_country: string | null; company_name: string | null; anonymous_id: string | null }) => {
        cmap[r.id] = r.billing_country;
        nmap[r.id] = r.company_name || r.anonymous_id || "";
      });
      setEscortCountries(cmap);
      setEscortNames((prev) => ({ ...prev, ...nmap }));
    }
    if (clientIds.length) {
      const { data: cc } = await supabase
        .from("profiles")
        .select("id, billing_country, company_name, full_name, anonymous_id")
        .in("id", clientIds);
      const cmap: Record<string, string | null> = {};
      const nmap: Record<string, string> = {};
      (cc ?? []).forEach((r: { id: string; billing_country: string | null; company_name: string | null; full_name: string | null; anonymous_id: string | null }) => {
        cmap[r.id] = r.billing_country;
        nmap[r.id] = r.company_name || r.full_name || r.anonymous_id || "";
      });
      setClientCountries((prev) => ({ ...prev, ...cmap }));
      setClientNames((prev) => ({ ...prev, ...nmap }));
    }
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
      const platClientIds = [...new Set(platList.map((i) => i.client_id))];
      if (platClientIds.length) {
        const { data: pc } = await supabase
          .from("profiles")
          .select("id, billing_country, company_name, full_name, anonymous_id")
          .in("id", platClientIds);
        const cmap: Record<string, string | null> = {};
        const nmap: Record<string, string> = {};
        (pc ?? []).forEach((r: { id: string; billing_country: string | null; company_name: string | null; full_name: string | null; anonymous_id: string | null }) => {
          cmap[r.id] = r.billing_country;
          nmap[r.id] = r.company_name || r.full_name || r.anonymous_id || "";
        });
        setClientCountries((prev) => ({ ...prev, ...cmap }));
        setClientNames((prev) => ({ ...prev, ...nmap }));
      }
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
    else toast.success(t("invoices.freqUpdated", { label: t(freq === "weekly" ? "invoices.weeklyLower" : "invoices.monthlyLower") }));
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("invoices.markedPaid"));
    load();
  };

  const markPlatformPaid = async (id: string) => {
    const { error } = await supabase
      .from("platform_invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("invoices.markedPaid"));
    load();
  };

  // PDF generation now happens server-side via the `generate-invoice-pdf` edge function.
  // The local helpers/constants for client-side rendering have been removed.

  const triggerDownload = async (url: string, filename: string) => {
    // Fetch the PDF as a blob so we can force a real download in every browser
    // (incl. iOS Safari / in-app webviews that ignore the `download` attribute
    // on cross-origin URLs and otherwise just preview the file).
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const pdfBlob =
        blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      // Fallback: open in a new tab so the user can still save it manually.
      window.open(url, "_blank", "noopener");
    }
  };

  const openInvoiceFile = async (
    invoiceId: string,
    type: "regular" | "platform",
    cachedPath: string | null | undefined,
    cachedXmlPath: string | null | undefined,
    invoiceNumber: string | null | undefined,
    format: "pdf" | "xml",
  ) => {
    try {
      const ext = format;
      const filename = `${invoiceNumber || invoiceId}.${ext}`;
      const cached = format === "pdf" ? cachedPath : cachedXmlPath;
      if (cached) {
        const { data, error } = await supabase.storage
          .from("invoices")
          .createSignedUrl(cached, 60 * 10, { download: filename });
        if (!error && data?.signedUrl) {
          await triggerDownload(data.signedUrl, filename);
          return;
        }
      }
      const { data, error } = await supabase.functions.invoke("generate-invoice-pdf", {
        body: { invoice_id: invoiceId, type },
      });
      if (error) throw error;
      const resp = data as { signed_url?: string; xml_signed_url?: string } | null;
      const signed = format === "pdf" ? resp?.signed_url : resp?.xml_signed_url;
      if (!signed) throw new Error("Geen download-URL ontvangen");
      await triggerDownload(signed, filename);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const downloadEscortPdf = (inv: Invoice) =>
    openInvoiceFile(inv.id, "regular",
      (inv as Invoice & { pdf_path?: string | null }).pdf_path,
      (inv as Invoice & { xml_path?: string | null }).xml_path,
      inv.invoice_number, "pdf");

  const downloadEscortXml = (inv: Invoice) =>
    openInvoiceFile(inv.id, "regular",
      (inv as Invoice & { pdf_path?: string | null }).pdf_path,
      (inv as Invoice & { xml_path?: string | null }).xml_path,
      inv.invoice_number, "xml");

  const downloadPlatformPdf = (inv: PlatformInvoice) =>
    openInvoiceFile(inv.id, "platform",
      (inv as PlatformInvoice & { pdf_path?: string | null }).pdf_path,
      (inv as PlatformInvoice & { xml_path?: string | null }).xml_path,
      inv.invoice_number, "pdf");

  const downloadPlatformXml = (inv: PlatformInvoice) =>
    openInvoiceFile(inv.id, "platform",
      (inv as PlatformInvoice & { pdf_path?: string | null }).pdf_path,
      (inv as PlatformInvoice & { xml_path?: string | null }).xml_path,
      inv.invoice_number, "xml");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <Nav />
      <main className="px-6 md:px-8 py-16 md:py-20 bg-gradient-hero min-h-[calc(100vh-5rem)]">
        <div className="max-w-6xl mx-auto space-y-12">
          <header className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-brass-gold uppercase tracking-[0.3em] font-semibold text-xs mb-3">
                {isEscort ? t("common.escort") : t("common.client")}
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-brass-deep italic">{t("invoices.title")}</h1>
              <p className="text-sm text-brass-deep/60 mt-3">
                {t("invoices.intro")}
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-card shadow-etched">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-brass-deep/50 mb-1">
                {t("invoices.searchLabel")}
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEscort ? t("invoices.searchPlaceholderEscort") : t("invoices.searchPlaceholderClient")}
                className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-parchment focus:outline-none focus:border-brass-deep"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-brass-deep/50 mb-1">
                {t("invoices.dateFrom")}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-parchment focus:outline-none focus:border-brass-deep"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-brass-deep/50 mb-1">
                {t("invoices.dateTo")}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-brass-deep/20 bg-parchment focus:outline-none focus:border-brass-deep"
              />
            </div>
            {(search || dateFrom || dateTo) && (
              <div className="md:col-span-3">
                <button
                  onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
                  className="text-[10px] uppercase tracking-widest font-semibold text-brass-deep/70 hover:text-brass-gold underline"
                >
                  {t("invoices.clearFilters")}
                </button>
              </div>
            )}
          </div>

          {!isEscort && (
            <Tabs defaultValue="begeleiders" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="begeleiders">{t("invoices.tabEscorts", { n: invoices.length })}</TabsTrigger>
                <TabsTrigger value="platform">{t("invoices.tabPlatform", { n: platformInvoices.length })}</TabsTrigger>
              </TabsList>

              <TabsContent value="begeleiders">
                {renderEscortInvoices()}
              </TabsContent>

              <TabsContent value="platform" className="space-y-6">
                <div className="bg-card shadow-etched p-6 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.frequency")}</p>
                    <p className="text-sm text-brass-deep/70">{t("invoices.feeIntro")}</p>
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
                        {t(f === "weekly" ? "invoices.weekly" : "invoices.monthly")}
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
      <CheckoutDialog
        open={!!payInvoiceId}
        onOpenChange={(v) => !v && setPayInvoiceId(null)}
        title={t("invoices.payDialogTitle")}
        platformInvoiceId={payInvoiceId ?? undefined}
        customerEmail={user?.email}
        userId={user?.id}
        returnUrl={`${window.location.origin}/facturen?paid=1`}
      />
    </div>
  );

  function matchesFilter(inv: { invoice_number: string; period_start: string; period_end: string; escort_id?: string; client_id: string }) {
    const q = search.trim().toLowerCase();
    if (q) {
      const eName = inv.escort_id ? escortNames[inv.escort_id] || "" : "";
      const cName = clientNames[inv.client_id] || "";
      const hay = [inv.invoice_number, eName, cName].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (dateFrom && new Date(inv.period_end) < new Date(dateFrom)) return false;
    if (dateTo && new Date(inv.period_start) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }

  function renderGrouped<T extends { id: string; period_start: string }>(items: T[], renderItem: (i: T) => JSX.Element, emptyText: string) {
    if (items.length === 0)
      return (
        <div className="bg-card shadow-etched p-12 text-center">
          <p className="text-brass-deep/60">{emptyText}</p>
        </div>
      );
    const tree = groupByYMW(items);
    const years = Object.keys(tree).sort(sortYearDesc);
    const expandAll = !!(search || dateFrom || dateTo);
    return (
      <div className="space-y-2">
        {years.map((y, yi) => {
          const months = Object.keys(tree[y]).sort(sortDescNum);
          const yearCount = months.reduce((s, m) => s + Object.values(tree[y][m]).reduce((a, arr) => a + arr.length, 0), 0);
          return (
            <details key={y} open={expandAll || yi === 0} className="group bg-card shadow-etched">
              <summary className="flex items-center justify-between cursor-pointer select-none px-5 py-3 hover:bg-parchment/50">
                <span className="font-display text-lg text-brass-deep">{y}</span>
                <span className="text-[10px] uppercase tracking-widest text-brass-deep/55">
                  {t("invoices.invoiceCount", { count: yearCount })}
                  <span className="ml-2 inline-block transition-transform group-open:rotate-180">▼</span>
                </span>
              </summary>
              <div className="px-3 pb-3 space-y-2">
                {months.map((m) => {
                  const weeks = Object.keys(tree[y][m]).sort(sortDescNum);
                  const monthCount = weeks.reduce((s, w) => s + tree[y][m][w].length, 0);
                  return (
                    <details key={m} open={expandAll} className="group/m border border-brass-deep/10 bg-parchment/30">
                      <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2 hover:bg-parchment/60">
                        <span className="text-sm font-semibold text-brass-deep">{monthName(parseInt(m, 10), i18n.language)}</span>
                        <span className="text-[10px] uppercase tracking-widest text-brass-deep/55">
                          {monthCount}
                          <span className="ml-2 inline-block transition-transform group-open/m:rotate-180">▼</span>
                        </span>
                      </summary>
                      <div className="px-2 pb-2 space-y-2">
                        {weeks.map((w) => (
                          <details key={w} open={expandAll} className="group/w border border-brass-deep/10 bg-card">
                            <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2 hover:bg-parchment/40">
                              <span className="text-xs uppercase tracking-widest font-semibold text-brass-deep/80">{t("invoices.week", { n: parseInt(w, 10) })}</span>
                              <span className="text-[10px] uppercase tracking-widest text-brass-deep/55">
                                {tree[y][m][w].length}
                                <span className="ml-2 inline-block transition-transform group-open/w:rotate-180">▼</span>
                              </span>
                            </summary>
                            <ul className="space-y-px bg-brass-deep/10">
                              {tree[y][m][w].map(renderItem)}
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
  }

  function renderPlatformInvoices() {
    if (loading) return <p className="text-sm text-brass-deep/50">{t("common.loading")}</p>;
    const filtered = platformInvoices.filter(matchesFilter);
    const renderInv = (inv: PlatformInvoice) => {
      const isOpen = openPlat === inv.id;
      const rows = platformItems[inv.id] ?? [];
      return (
            <li key={inv.id} className="bg-card p-6 md:p-8">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-12 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.invoice")}</p>
                  <p className="font-display text-xl text-brass-deep tabular-nums">{inv.invoice_number}</p>
                  <p className="text-xs text-brass-deep/55 mt-1">{fd(inv.created_at)}</p>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.period")}</p>
                  <p className="text-sm">{fd(inv.period_start)} → {fd(inv.period_end)}</p>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.escortsCount")}</p>
                  <p className="font-semibold tabular-nums">{inv.total_escorts}</p>
                </div>
                <div className="col-span-6 md:col-span-2">
                  <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.total")}</p>
                  <p className="font-semibold tabular-nums text-brass-gold">{fmtMoney(inv.total_amount)}</p>
                </div>
                <div className="col-span-12 md:col-span-1 text-right">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-brass-gold">{t(`status.${inv.status}` as any)}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setOpenPlat(isOpen ? null : inv.id)}
                  className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                >
                  {isOpen ? t("invoices.hideRows") : t("invoices.showRows")}
                </button>
                <button
                  onClick={() => downloadPlatformPdf(inv)}
                  className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                >
                  {t("common.downloadPdf")}
                </button>
                <button
                  onClick={() => downloadPlatformXml(inv)}
                  className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                  title="UBL e-factuur (Peppol)"
                >
                  XML
                </button>
                {inv.status !== "paid" && (
                  <button
                    onClick={() => setPayInvoiceId(inv.id)}
                    className="ml-auto px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                  >
                    Betaal nu
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="mt-6 pt-6 border-t border-brass-deep/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-widest text-brass-deep/50">
                        <th className="text-left py-2">{t("invoices.date")}</th>
                        <th className="text-left py-2">{t("invoices.route")}</th>
                        <th className="text-right py-2">{t("invoices.escortsCount")}</th>
                        <th className="text-right py-2">{t("invoices.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-t border-brass-deep/5">
                          <td className="py-2 tabular-nums">{fd(r.ride_date)}</td>
                          <td className="py-2">{r.route}</td>
                          <td className="py-2 text-right tabular-nums">{r.num_escorts}</td>
                          <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-brass-deep/30">
                        <td colSpan={3} className="py-3 text-right text-xs uppercase tracking-widest font-bold text-brass-deep">
                          {t("invoices.total")}
                        </td>
                        <td className="py-3 text-right tabular-nums font-bold text-brass-gold text-base">{fmtMoney(inv.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </li>
      );
    };
    return renderGrouped(filtered, renderInv, t("invoices.noPlatform"));
  }

  function renderEscortInvoices() {
    if (loading) return <p className="text-sm text-brass-deep/50">{t("common.loading")}</p>;
    const filtered = invoices.filter(matchesFilter);
    const renderInv = (inv: Invoice) => {
      const isOpen = open === inv.id;
      const rows = items[inv.id] ?? [];
      return (
                  <li key={inv.id} className="bg-card p-6 md:p-8">
                    <div className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-12 md:col-span-3">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.invoice")}</p>
                        <p className="font-display text-xl text-brass-deep tabular-nums">{inv.invoice_number}</p>
                        <p className="text-xs text-brass-deep/55 mt-1">{fd(inv.created_at)}</p>
                      </div>
                      <div className="col-span-12 md:col-span-4">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.period")}</p>
                        <p className="text-sm">{fd(inv.period_start)} → {fd(inv.period_end)}</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.hours")}</p>
                        <p className="font-semibold tabular-nums">{Number(inv.total_hours).toFixed(2)}u</p>
                      </div>
                      <div className="col-span-6 md:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{t("invoices.total")}</p>
                        <p className="font-semibold tabular-nums text-brass-gold">{fmtMoney(inv.total_amount)}</p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-brass-gold">{t(`status.${inv.status}` as any)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setOpen(isOpen ? null : inv.id)}
                        className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                      >
                        {isOpen ? t("invoices.hideRows") : t("invoices.showRows")}
                      </button>
                      <button
                        onClick={() => downloadEscortPdf(inv)}
                        className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                      >
                        {t("common.downloadPdf")}
                      </button>
                      <button
                        onClick={() => downloadEscortXml(inv)}
                        className="text-xs uppercase tracking-widest text-brass-deep/70 hover:text-brass-gold font-semibold"
                        title="UBL e-factuur (Peppol)"
                      >
                        XML
                      </button>
                      {!isEscort && inv.status !== "paid" && (
                        <button
                          onClick={() => markPaid(inv.id)}
                          className="ml-auto px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors"
                        >
                          {t("invoices.markPaid")}
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
                      const vatRate = vatRateFor(
                        { billing_country: escortCountries[inv.escort_id] ?? null },
                        { billing_country: clientCountries[inv.client_id] ?? null },
                      );
                      const reverseCharge = vatRate === 0;
                      const vat = subtotal * vatRate;
                      const weroFee = wero.enabled ? wero.fee : 0;
                      const total = subtotal + vat + weroFee;
                      return (
                        <div className="mt-6 pt-6 border-t border-brass-deep/10">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-[10px] uppercase tracking-widest text-brass-deep/50">
                                <th className="text-left py-2">{t("invoices.date")}</th>
                                <th className="text-left py-2">{t("invoices.description")}</th>
                                <th className="text-right py-2">{t("invoices.hours")}</th>
                                <th className="text-right py-2">{t("invoices.rate")}</th>
                                <th className="text-right py-2">{t("invoices.amount")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rideRows.map((r) => (
                                <tr key={r.id} className="border-t border-brass-deep/5">
                                  <td className="py-2 tabular-nums">{fd(r.ride_date)}</td>
                                  <td className="py-2">{r.description}</td>
                                  <td className="py-2 text-right tabular-nums">{Number(r.hours).toFixed(2)}</td>
                                  <td className="py-2 text-right tabular-nums">{fmtMoney(r.hourly_rate)}</td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                                </tr>
                              ))}
                              <tr className="border-t-2 border-brass-deep/20">
                                <td colSpan={4} className="py-3 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  {t("invoices.subtotalRides")}
                                </td>
                                <td className="py-3 text-right tabular-nums font-semibold">{fmtMoney(ridesSubtotal)}</td>
                              </tr>

                              {fuelRows.length > 0 && fuelRows.map((r) => (
                                <tr key={r.id} className="border-t border-brass-deep/5">
                                  <td className="py-2 tabular-nums">{fd(r.ride_date)}</td>
                                  <td className="py-2">{r.description}</td>
                                  <td className="py-2 text-right tabular-nums">{Number(r.hours).toFixed(2)}</td>
                                  <td className="py-2 text-right tabular-nums">{fmtMoney(r.hourly_rate)}</td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(r.amount)}</td>
                                </tr>
                              ))}
                              {fuelRows.length > 0 && (
                                <tr className="border-t border-brass-deep/10">
                                  <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                    {t("invoices.fuelSurcharge")}
                                  </td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(fuelSubtotal)}</td>
                                </tr>
                              )}

                              <tr className="border-t border-brass-deep/10">
                                <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  {t("invoices.subtotalExcl")}
                                </td>
                                <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(subtotal)}</td>
                              </tr>
                              <tr>
                                <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                  {reverseCharge ? t("invoices.vatReverse") : t("invoices.vat21")}
                                </td>
                                <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(vat)}</td>
                              </tr>
                              {reverseCharge && (
                                <tr>
                                  <td colSpan={5} className="py-2 text-right text-[10px] italic text-brass-deep/55">
                                    {t("invoices.vatNote")}
                                  </td>
                                </tr>
                              )}
                              {weroFee > 0 && (
                                <tr>
                                  <td colSpan={4} className="py-2 text-right text-[10px] uppercase tracking-widest font-bold text-brass-deep/70">
                                    {t("invoices.weroSurcharge")}
                                  </td>
                                  <td className="py-2 text-right tabular-nums font-semibold">{fmtMoney(weroFee)}</td>
                                </tr>
                              )}
                              <tr className="border-t-2 border-brass-deep/30">
                                <td colSpan={4} className="py-3 text-right text-xs uppercase tracking-widest font-bold text-brass-deep">
                                  {t("invoices.finalTotal")}
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
    };
    return renderGrouped(filtered, renderInv, t("invoices.noInvoices"));
  }
};

const Invoices = () => (
  <RequireAuth>
    <InvoicesInner />
  </RequireAuth>
);

export default Invoices;
