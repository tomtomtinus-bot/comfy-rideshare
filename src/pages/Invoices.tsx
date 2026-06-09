import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CheckoutDialog } from "@/components/CheckoutDialog";


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
  pdf_path?: string | null;
  xml_path?: string | null;
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
  pdf_path?: string | null;
  xml_path?: string | null;
}

const fmtDate = (d: string, lng: string) =>
  new Date(d).toLocaleDateString(
    lng === "nl" ? "nl-NL" : lng === "de" ? "de-DE" : lng === "fr" ? "fr-FR" : "en-GB",
    { dateStyle: "medium" },
  );
const fmtMoney = (n: number) => `€${Number(n).toFixed(2)}`;

const InvoicesInner = () => {
  const { user, role } = useAuth();
  const { t, i18n } = useTranslation();
  const fd = (d: string) => fmtDate(d, i18n.language);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>([]);
  const [escortNames, setEscortNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
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

    const escortIds = [...new Set(list.map((i) => i.escort_id))];
    const clientIds = [...new Set(list.map((i) => i.client_id))];
    if (escortIds.length) {
      const { data: ec } = await supabase
        .from("escort_profiles_public")
        .select("id, company_name, anonymous_id")
        .in("id", escortIds);
      const nmap: Record<string, string> = {};
      (ec ?? []).forEach((r: any) => {
        nmap[r.id] = r.company_name || r.anonymous_id || "";
      });
      setEscortNames((prev) => ({ ...prev, ...nmap }));
    }
    if (clientIds.length) {
      const { data: cc } = await supabase
        .from("profiles")
        .select("id, company_name, full_name, anonymous_id")
        .in("id", clientIds);
      const nmap: Record<string, string> = {};
      (cc ?? []).forEach((r: any) => {
        nmap[r.id] = r.company_name || r.full_name || r.anonymous_id || "";
      });
      setClientNames((prev) => ({ ...prev, ...nmap }));
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
          .select("id, company_name, full_name, anonymous_id")
          .in("id", platClientIds);
        const nmap: Record<string, string> = {};
        (pc ?? []).forEach((r: any) => {
          nmap[r.id] = r.company_name || r.full_name || r.anonymous_id || "";
        });
        setClientNames((prev) => ({ ...prev, ...nmap }));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const triggerDownload = async (url: string, filename: string) => {
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
    preview = false,
  ) => {
    try {
      const ext = format;
      const filename = `${invoiceNumber || invoiceId}.${ext}`;
      const cached = format === "pdf" ? cachedPath : cachedXmlPath;
      if (cached) {
        const { data, error } = await supabase.storage
          .from("invoices")
          .createSignedUrl(cached, 60 * 10, preview ? undefined : { download: filename });
        if (!error && data?.signedUrl) {
          if (preview) window.open(data.signedUrl, "_blank", "noopener");
          else await triggerDownload(data.signedUrl, filename);
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
      if (preview) window.open(signed, "_blank", "noopener");
      else await triggerDownload(signed, filename);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const matchesFilter = (inv: {
    invoice_number: string;
    period_start: string;
    period_end: string;
    escort_id?: string;
    client_id: string;
  }) => {
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
  };

  const filteredEscort = useMemo(
    () => invoices.filter(matchesFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, search, dateFrom, dateTo, escortNames, clientNames],
  );
  const filteredPlatform = useMemo(
    () => platformInvoices.filter(matchesFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [platformInvoices, search, dateFrom, dateTo, clientNames],
  );

  const statusBadge = (status: string) => {
    const paid = status === "paid";
    return (
      <Badge
        variant={paid ? "secondary" : "outline"}
        className={
          paid
            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10"
            : "bg-amber-500/10 text-amber-700 border-amber-500/20"
        }
      >
        {paid ? t("status.paid") : t("status.open")}
      </Badge>
    );
  };

  const renderActions = (
    onView: () => void,
    onDownload: () => void,
    onXml: () => void,
    extra?: React.ReactNode,
  ) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onView}>{t("invoices.viewPdf") || "PDF bekijken"}</DropdownMenuItem>
        <DropdownMenuItem onClick={onDownload}>{t("common.downloadPdf")}</DropdownMenuItem>
        <DropdownMenuItem onClick={onXml}>XML (Peppol)</DropdownMenuItem>
        {extra}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderEscortTable = () => (
    <div className="rounded-md border border-input bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">{t("invoices.invoice") || "Factuurnummer"}</TableHead>
            <TableHead className="w-[120px]">{t("invoices.date") || "Datum"}</TableHead>
            <TableHead>{isEscort ? t("common.client") : t("common.escort")}</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="text-right w-[110px]">{t("invoices.amount") || "Bedrag"}</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                {t("common.loading")}
              </TableCell>
            </TableRow>
          ) : filteredEscort.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                {t("invoices.noInvoices")}
              </TableCell>
            </TableRow>
          ) : (
            filteredEscort.map((inv) => {
              const counterparty = isEscort
                ? clientNames[inv.client_id] || "—"
                : escortNames[inv.escort_id] || "—";
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium tabular-nums">{inv.invoice_number}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {fd(inv.created_at)}
                  </TableCell>
                  <TableCell className="truncate max-w-[260px]">{counterparty}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      Begeleider
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoney(inv.total_amount)}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {renderActions(
                      () =>
                        openInvoiceFile(
                          inv.id,
                          "regular",
                          inv.pdf_path,
                          inv.xml_path,
                          inv.invoice_number,
                          "pdf",
                          true,
                        ),
                      () =>
                        openInvoiceFile(
                          inv.id,
                          "regular",
                          inv.pdf_path,
                          inv.xml_path,
                          inv.invoice_number,
                          "pdf",
                        ),
                      () =>
                        openInvoiceFile(
                          inv.id,
                          "regular",
                          inv.pdf_path,
                          inv.xml_path,
                          inv.invoice_number,
                          "xml",
                        ),
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderPlatformTable = () => (
    <div className="rounded-md border border-input bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">{t("invoices.invoice") || "Factuurnummer"}</TableHead>
            <TableHead className="w-[120px]">{t("invoices.date") || "Datum"}</TableHead>
            <TableHead>{t("common.client")}</TableHead>
            <TableHead className="w-[120px]">Type</TableHead>
            <TableHead className="text-right w-[110px]">{t("invoices.amount") || "Bedrag"}</TableHead>
            
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                {t("common.loading")}
              </TableCell>
            </TableRow>
          ) : filteredPlatform.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                {t("invoices.noPlatform")}
              </TableCell>
            </TableRow>
          ) : (
            filteredPlatform.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium tabular-nums">{inv.invoice_number}</TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {fd(inv.created_at)}
                </TableCell>
                <TableCell className="truncate max-w-[260px]">
                  {clientNames[inv.client_id] || "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    App-fee
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {fmtMoney(inv.total_amount)}
                </TableCell>
                
                <TableCell className="text-right">
                  {renderActions(
                    () =>
                      openInvoiceFile(
                        inv.id,
                        "platform",
                        inv.pdf_path,
                        inv.xml_path,
                        inv.invoice_number,
                        "pdf",
                        true,
                      ),
                    () =>
                      openInvoiceFile(
                        inv.id,
                        "platform",
                        inv.pdf_path,
                        inv.xml_path,
                        inv.invoice_number,
                        "pdf",
                      ),
                    () =>
                      openInvoiceFile(
                        inv.id,
                        "platform",
                        inv.pdf_path,
                        inv.xml_path,
                        inv.invoice_number,
                        "xml",
                      ),
                    inv.status !== "paid" ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setPayInvoiceId(inv.id)}>
                          {t("invoices.payNow")}
                        </DropdownMenuItem>
                      </>
                    ) : null,
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      <SeoHead
        title="Facturen | ViaCust"
        description="Bekijk, download en betaal je facturen voor transportritten en platformkosten."
      />
      <Nav />
      <main className="px-6 md:px-8 py-6 md:py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{t("invoices.title") || "Facturen"}</h1>
            <p className="text-sm text-muted-foreground">{t("invoices.intro")}</p>
          </header>

          <div className="flex flex-wrap gap-2">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEscort
                  ? t("invoices.searchPlaceholderEscort")
                  : t("invoices.searchPlaceholderClient")
              }
              className="h-9 flex-1 min-w-[200px]"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 w-[160px]"
              aria-label={t("invoices.dateFrom")}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 w-[160px]"
              aria-label={t("invoices.dateTo")}
            />
            {(search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                {t("invoices.clearFilters")}
              </Button>
            )}
          </div>

          {!isEscort ? (
            <Tabs defaultValue="begeleiders" className="w-full">
              <TabsList>
                <TabsTrigger value="begeleiders">
                  {t("invoices.tabEscorts", { n: invoices.length })}
                </TabsTrigger>
                <TabsTrigger value="platform">
                  {t("invoices.tabPlatform", { n: platformInvoices.length })}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="begeleiders" className="mt-4">
                {renderEscortTable()}
              </TabsContent>
              <TabsContent value="platform" className="mt-4">
                {renderPlatformTable()}
              </TabsContent>
            </Tabs>
          ) : (
            renderEscortTable()
          )}
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
};

const Invoices = () => (
  <RequireAuth>
    <InvoicesInner />
  </RequireAuth>
);

export default Invoices;
