// Generates a PDF for a regular invoice or platform invoice,
// uploads it to the private "invoices" bucket, stores the pdf_path,
// and returns a short-lived signed download URL.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import * as autoTableModule from "npm:jspdf-autotable@3.8.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { dateStyle: "short" });
const fmtMoney = (n: number) =>
  `€ ${Number(n).toLocaleString("nl-NL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// jsPDF default helvetica uses WinAnsi encoding which has no glyph for "→",
// "—", non-breaking space etc. Replace with safe ASCII so they don't render
// as `!'` boxes on invoices.
const safe = (s: string): string =>
  s
    .replace(/→/g, ">")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/\u00a0/g, " ");

type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;
type AutoTablePluginFn = (jsPDFClass: typeof jsPDF) => void;
const autoTableExports = autoTableModule as unknown as {
  autoTable?: AutoTableFn;
  applyPlugin?: AutoTablePluginFn;
  default?: AutoTableFn | { autoTable?: AutoTableFn; default?: AutoTableFn; applyPlugin?: AutoTablePluginFn };
};
const autoTableDefault = autoTableExports.default;
const resolvedAutoTable = autoTableExports.autoTable
  ?? (typeof autoTableDefault === "function" ? autoTableDefault : autoTableDefault?.autoTable)
  ?? (typeof autoTableDefault === "object" ? autoTableDefault.default : undefined);
const applyAutoTablePlugin = autoTableExports.applyPlugin
  ?? (typeof autoTableDefault === "object" ? autoTableDefault.applyPlugin : undefined);

const addInvoiceTable = (doc: jsPDF, options: Record<string, unknown>) => {
  if (typeof resolvedAutoTable === "function") {
    resolvedAutoTable(doc, options);
    return;
  }
  if (typeof applyAutoTablePlugin === "function") {
    applyAutoTablePlugin(jsPDF);
  }
  const docAutoTable = (doc as unknown as { autoTable?: (options: Record<string, unknown>) => void }).autoTable;
  if (typeof docAutoTable !== "function") {
    throw new Error("PDF tabelgenerator is niet beschikbaar");
  }
  docAutoTable.call(doc, options);
};

interface BillingParty {
  company_name?: string | null;
  billing_contact_name?: string | null;
  billing_email?: string | null;
  billing_address?: string | null;
  billing_postcode?: string | null;
  billing_city?: string | null;
  billing_country?: string | null;
  kvk_number?: string | null;
  vat_number?: string | null;
  iban?: string | null;
  full_name?: string | null;
  wero_enabled?: boolean | null;
  wero_handle?: string | null;
  wero_fee?: number | null;
}

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

const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
const vatRateFor = (from: BillingParty, to: BillingParty) => {
  const a = norm(from.billing_country);
  const b = norm(to.billing_country);
  if (!a || !b) return 0.21;
  return a === b ? 0.21 : 0;
};

const senderLines = (p: BillingParty) =>
  [
    p.billing_contact_name || p.full_name || "",
    p.billing_address || "",
    [p.billing_postcode, p.billing_city].filter(Boolean).join(" "),
    p.iban ? `IBAN: ${p.iban}` : "",
    p.vat_number ? `BTW: ${p.vat_number}` : "",
    p.kvk_number ? `KVK: ${p.kvk_number}` : "",
  ].filter(Boolean);

const recipientLines = (p: BillingParty) =>
  [
    p.company_name || p.full_name || "",
    p.billing_contact_name || "",
    p.billing_address || "",
    [p.billing_postcode, p.billing_city].filter(Boolean).join(" "),
  ].filter(Boolean);

interface ShellOpts {
  invoice_number: string;
  created_at: string;
  period_start: string;
  period_end: string;
  from: BillingParty;
  to: BillingParty;
}

const drawShell = (doc: jsPDF, opts: ShellOpts, logoDataUrl: string | null) => {
  const pageW = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageW - 18;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", left, 12, 28, 28);
    } catch (_) { /* ignore */ }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20);
    doc.text("ViaCust", left, 25);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(25, 47, 76); // brand navy (matches site --primary)
  doc.text("Verstuurd via ViaCust", left, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40);
  let y = 18;
  doc.setFont("helvetica", "bold");
  doc.text(opts.from.company_name || opts.from.full_name || "", right, y, {
    align: "right",
  });
  y += 5;
  doc.setFont("helvetica", "normal");
  for (const line of senderLines(opts.from)) {
    doc.text(line, right, y, { align: "right" });
    y += 4.5;
  }

  doc.setDrawColor(20);
  doc.setLineWidth(0.4);
  doc.line(left, 56, right, 56);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Factuur:", left, 66);
  const rec = recipientLines(opts.to);
  doc.text(rec[0] ?? "", left, 76);
  doc.setFont("helvetica", "normal");
  rec.slice(1).forEach((line, i) => doc.text(line, left, 82 + i * 5));

  const metaX = pageW - 80;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Factuurdatum:", metaX, 66);
  doc.text(fmtDate(opts.created_at), right, 66, { align: "right" });
  doc.text("Factuurnummer:", metaX, 72);
  doc.text(opts.invoice_number, right, 72, { align: "right" });
  doc.text("Betalingsconditie:", metaX, 78);
  doc.text("30 dagen", right, 78, { align: "right" });
  doc.text("Periode:", metaX, 84);
  doc.text(`${fmtDate(opts.period_start)} - ${fmtDate(opts.period_end)}`, right, 84, {
    align: "right",
  });
};

const drawTotals = (
  doc: jsPDF,
  startY: number,
  subtotal: number,
  vatRate: number,
  total: number,
  weroFee: number,
  weroHandle: string | null,
) => {
  const pageW = doc.internal.pageSize.getWidth();
  const right = pageW - 18;
  const labelX = pageW - 80;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);
  let y = startY;

  doc.text("Subtotaal:", labelX, y);
  doc.text(fmtMoney(subtotal), right, y, { align: "right" });
  y += 6;

  if (vatRate === 0) {
    doc.text("BTW verlegd:", labelX, y);
    doc.text(fmtMoney(0), right, y, { align: "right" });
  } else {
    doc.text("BTW:", labelX, y);
    doc.text(`${(vatRate * 100).toFixed(0)}%`, labelX + 30, y);
    doc.text(fmtMoney(subtotal * vatRate), right, y, { align: "right" });
  }
  y += 6;

  if (weroFee > 0) {
    doc.text("Wero-betaaltoeslag:", labelX, y);
    doc.text(fmtMoney(weroFee), right, y, { align: "right" });
    y += 6;
  }

  doc.setDrawColor(20);
  doc.setLineWidth(0.3);
  doc.line(labelX, y, right, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Totaal te voldoen:", labelX, y);
  doc.text(fmtMoney(total), right, y, { align: "right" });
  y += 10;

  if (vatRate === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text(
      "BTW verlegd naar de afnemer (intracommunautaire dienst, art. 196 EU-richtlijn 2006/112/EG).",
      labelX,
      y,
      { maxWidth: right - labelX },
    );
    y += 8;
  }

  if (weroHandle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.text("Betaal eenvoudig met Wero naar:", labelX, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.text(weroHandle, labelX, y);
  }
};

const drawFootNote = (doc: jsPDF, invoiceNumber: string) => {
  const pageW = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    `Bij betaling factuurnummer vermelden:  ${invoiceNumber}`,
    pageW / 2,
    h - 18,
    { align: "center" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("Gegenereerd via Lowloads", pageW / 2, h - 12, { align: "center" });
};

// ---------- UBL 2.1 (Peppol BIS Billing 3.0) e-factuur builder ----------
const xmlEscape = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const num2 = (n: number): string => (Math.round(Number(n) * 100) / 100).toFixed(2);
const isoDay = (d: string | Date): string => new Date(d).toISOString().slice(0, 10);

const countryCode = (c?: string | null): string => {
  const v = (c ?? "").trim().toLowerCase();
  if (!v) return "NL";
  if (v.startsWith("ned") || v === "nl" || v === "netherlands") return "NL";
  if (v.startsWith("bel") || v === "be" || v === "belgium" || v === "belgië") return "BE";
  if (v.startsWith("duits") || v === "de" || v === "germany") return "DE";
  if (v.startsWith("frank") || v === "fr" || v === "france") return "FR";
  if (v.startsWith("lux") || v === "lu") return "LU";
  return v.slice(0, 2).toUpperCase();
};

interface UblOpts {
  type: "regular" | "platform";
  invoice: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  from: BillingParty;
  to: BillingParty;
  subtotal: number;
  vatRate: number;
}

const buildPartyXml = (label: "AccountingSupplierParty" | "AccountingCustomerParty", p: BillingParty): string => {
  const name = p.company_name || p.full_name || p.billing_contact_name || "";
  const cc = countryCode(p.billing_country);
  const vat = p.vat_number ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${xmlEscape(p.vat_number)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>` : "";
  const kvk = p.kvk_number ? `
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(name)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="${cc === "NL" ? "0106" : "0208"}">${xmlEscape(p.kvk_number)}</cbc:CompanyID>
      </cac:PartyLegalEntity>` : `
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${xmlEscape(name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>`;
  const contact = p.billing_email ? `
      <cac:Contact>
        ${p.billing_contact_name ? `<cbc:Name>${xmlEscape(p.billing_contact_name)}</cbc:Name>` : ""}
        <cbc:ElectronicMail>${xmlEscape(p.billing_email)}</cbc:ElectronicMail>
      </cac:Contact>` : "";
  return `
  <cac:${label}>
    <cac:Party>
      <cac:PartyName><cbc:Name>${xmlEscape(name)}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        ${p.billing_address ? `<cbc:StreetName>${xmlEscape(p.billing_address)}</cbc:StreetName>` : ""}
        ${p.billing_city ? `<cbc:CityName>${xmlEscape(p.billing_city)}</cbc:CityName>` : ""}
        ${p.billing_postcode ? `<cbc:PostalZone>${xmlEscape(p.billing_postcode)}</cbc:PostalZone>` : ""}
        <cac:Country><cbc:IdentificationCode>${cc}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>${vat}${kvk}${contact}
    </cac:Party>
  </cac:${label}>`;
};

const buildUblInvoice = (opts: UblOpts): string => {
  const { type, invoice, items, from, to, subtotal, vatRate } = opts;
  const vatAmount = subtotal * vatRate;
  const total = subtotal + vatAmount;
  const currency = "EUR";
  const issue = isoDay(String(invoice.created_at));
  const due = isoDay(new Date(new Date(String(invoice.created_at)).getTime() + 30 * 86400_000));
  const invNum = String(invoice.invoice_number);

  const lines = items.map((it, idx) => {
    const qty = type === "regular"
      ? Number(it.hours ?? 1)
      : Number(it.num_escorts ?? 1);
    const amount = Number(it.amount ?? 0);
    const unitPrice = qty > 0 ? amount / qty : amount;
    const desc = type === "regular"
      ? String(it.description ?? "Begeleiding")
      : `App-fee ${String(it.route ?? "")}`.trim();
    const unitCode = type === "regular" ? "HUR" : "C62";
    return `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unitCode}">${num2(qty)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${num2(amount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${xmlEscape(desc)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${vatRate === 0 ? "AE" : "S"}</cbc:ID>
        <cbc:Percent>${num2(vatRate * 100)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${num2(unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join("");

  const taxCat = vatRate === 0
    ? `<cbc:ID>AE</cbc:ID><cbc:Percent>0.00</cbc:Percent><cbc:TaxExemptionReasonCode>VATEX-EU-AE</cbc:TaxExemptionReasonCode><cbc:TaxExemptionReason>Reverse charge</cbc:TaxExemptionReason>`
    : `<cbc:ID>S</cbc:ID><cbc:Percent>${num2(vatRate * 100)}</cbc:Percent>`;

  const payment = from.iban ? `
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cbc:PaymentID>${xmlEscape(invNum)}</cbc:PaymentID>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${xmlEscape(from.iban)}</cbc:ID>
      ${from.bank_account_holder ? `<cbc:Name>${xmlEscape(from.bank_account_holder)}</cbc:Name>` : ""}
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:nen.nl:nlcius:v1.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${xmlEscape(invNum)}</cbc:ID>
  <cbc:IssueDate>${issue}</cbc:IssueDate>
  <cbc:DueDate>${due}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cbc:BuyerReference>${xmlEscape(invNum)}</cbc:BuyerReference>
  <cac:InvoicePeriod>
    <cbc:StartDate>${isoDay(String(invoice.period_start))}</cbc:StartDate>
    <cbc:EndDate>${isoDay(String(invoice.period_end))}</cbc:EndDate>
  </cac:InvoicePeriod>${buildPartyXml("AccountingSupplierParty", from)}${buildPartyXml("AccountingCustomerParty", to)}${payment}
  <cac:PaymentTerms><cbc:Note>Betaling binnen 30 dagen</cbc:Note></cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currency}">${num2(vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currency}">${num2(subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currency}">${num2(vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>${taxCat}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currency}">${num2(subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currency}">${num2(subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currency}">${num2(total)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currency}">${num2(total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</Invoice>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const invoiceId = String(body?.invoice_id ?? "");
    const type = body?.type === "platform" ? "platform" : "regular";
    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoice_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine mode: "user" (returns signed URL after authz) or "internal"
    // (called by DB trigger; only generates+stores, no signed URL returned).
    let uid: string | null = null;
    const bearer = authHeader?.replace(/^Bearer\s+/i, "").trim() ?? "";
    const isInternal = !bearer || bearer === anonKey || bearer === serviceKey;
    if (!isInternal) {
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      uid = userData.user.id;
    }

    const admin = createClient(url, serviceKey);

    // Fetch logo (public bucket) once per call
    let logoDataUrl: string | null = null;
    try {
      const logoRes = await fetch(`${url}/storage/v1/object/public/branding/viacust-logo.png`);
      if (logoRes.ok) {
        const buf = new Uint8Array(await logoRes.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        logoDataUrl = `data:image/png;base64,${btoa(bin)}`;
      }
    } catch (_) { /* ignore */ }

    // Fetch invoice + check access
    let invoice: Record<string, unknown> | null = null;
    let items: Array<Record<string, unknown>> = [];
    let from: BillingParty;
    let to: BillingParty;

    if (type === "regular") {
      const { data: inv } = await admin
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!inv) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Authorize: escort, client, or admin (skip when internal trigger call)
      if (!isInternal) {
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", uid!)
          .eq("role", "admin")
          .maybeSingle();
        const isAdmin = !!roleRow;
        if (!isAdmin && uid !== inv.escort_id && uid !== inv.client_id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      invoice = inv;

      const [{ data: its }, { data: ep }, { data: epProf }, { data: cp }] =
        await Promise.all([
          admin
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", invoiceId)
            .order("ride_date"),
          admin.from("escort_profiles").select("*").eq("id", inv.escort_id).maybeSingle(),
          admin.from("profiles").select("*").eq("id", inv.escort_id).maybeSingle(),
          admin.from("profiles").select("*").eq("id", inv.client_id).maybeSingle(),
        ]);
      items = its ?? [];
      from = { ...(epProf ?? {}), ...(ep ?? {}) } as BillingParty;
      to = (cp ?? {}) as BillingParty;

      // Enrich: fetch ride metadata (route, reference, permit) for grouping
      const rideIds = Array.from(new Set(items.map((i) => String(i.ride_id)).filter(Boolean)));
      if (rideIds.length > 0) {
        const { data: rideRows } = await admin
          .from("rides")
          .select("id, scheduled_at, pickup_city, dropoff_city, client_reference, permit_number, license_plates")
          .in("id", rideIds);
        (invoice as Record<string, unknown>).__rides = rideRows ?? [];
      }
    } else {
      const { data: inv } = await admin
        .from("platform_invoices")
        .select("*")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!inv) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isInternal) {
        const { data: roleRow } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", uid!)
          .eq("role", "admin")
          .maybeSingle();
        const isAdmin = !!roleRow;
        if (!isAdmin && uid !== inv.client_id) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      invoice = inv;

      const [{ data: its }, { data: cp }] = await Promise.all([
        admin
          .from("platform_invoice_items")
          .select("*")
          .eq("platform_invoice_id", invoiceId)
          .order("ride_date"),
        admin.from("profiles").select("*").eq("id", inv.client_id).maybeSingle(),
      ]);
      items = its ?? [];

      // Enrich with ride reference (for clearer line item)
      const rideIds = Array.from(new Set(items.map((i) => String(i.ride_id)).filter(Boolean)));
      if (rideIds.length > 0) {
        const { data: rideRows } = await admin
          .from("rides")
          .select("id, client_reference")
          .in("id", rideIds);
        (invoice as Record<string, unknown>).__rides = rideRows ?? [];
      }

      from = PLATFORM_PARTY;
      to = (cp ?? {}) as BillingParty;
    }

    // Build PDF
    const doc = new jsPDF();
    const shellOpts: ShellOpts = {
      invoice_number: String(invoice!.invoice_number),
      created_at: String(invoice!.created_at),
      period_start: String(invoice!.period_start),
      period_end: String(invoice!.period_end),
      from,
      to,
    };
    drawShell(doc, shellOpts, logoDataUrl);

    let subtotal = 0;
    if (type === "regular") {
      subtotal = items.reduce((s, r) => s + Number(r.amount ?? 0), 0);

      // Group invoice_items per ride so each rit becomes a clear sub-block
      // with route + reference as section header and split lines beneath.
      type RideMeta = {
        id: string;
        scheduled_at?: string | null;
        pickup_city?: string | null;
        dropoff_city?: string | null;
        client_reference?: string | null;
        permit_number?: string | null;
        license_plates?: string[] | null;
      };
      const ridesMeta = ((invoice as Record<string, unknown>).__rides ?? []) as RideMeta[];
      const rideById = new Map(ridesMeta.map((r) => [r.id, r]));

      const groupOrder: string[] = [];
      const groups = new Map<string, Array<Record<string, unknown>>>();
      for (const it of items) {
        const rid = String(it.ride_id);
        if (!groups.has(rid)) {
          groups.set(rid, []);
          groupOrder.push(rid);
        }
        groups.get(rid)!.push(it);
      }

      type Row = Array<{ content: string; colSpan?: number; styles?: Record<string, unknown> } | string>;
      const body: Row[] = [];

      const classify = (desc: string): "uren" | "brandstof" | "extra" => {
        const d = desc.toLowerCase();
        if (d.startsWith("brandstof")) return "brandstof";
        if (d.startsWith("extra kosten")) return "extra";
        return "uren";
      };

      for (const rid of groupOrder) {
        const rows = groups.get(rid)!;
        const meta = rideById.get(rid);
        const refParts: string[] = [];
        if (meta?.client_reference) refParts.push(`ref. ${meta.client_reference}`);
        if (meta?.permit_number) refParts.push(`vergunning ${meta.permit_number}`);
        if (meta?.license_plates && meta.license_plates.length > 0) {
          refParts.push(meta.license_plates.join(", "));
        }
        const route = meta?.pickup_city && meta?.dropoff_city
          ? `${meta.pickup_city} > ${meta.dropoff_city}`
          : String(rows.find((r) => classify(String(r.description ?? "")) === "uren")?.description ?? "Rit");
        const dateStr = fmtDate(String(meta?.scheduled_at ?? rows[0].ride_date));
        const header = safe(`${dateStr}   ·   ${route}` + (refParts.length ? `   ·   ${refParts.join(" · ")}` : ""));

        body.push([{
          content: header,
          colSpan: 4,
          styles: {
            fontStyle: "bold",
            fillColor: [242, 238, 230],
            textColor: 20,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          },
        }]);

        const sorted = [...rows].sort((a, b) => {
          const order = { uren: 0, brandstof: 1, extra: 2 } as const;
          return order[classify(String(a.description ?? ""))] - order[classify(String(b.description ?? ""))];
        });

        let groupTotal = 0;
        for (const r of sorted) {
          const kind = classify(String(r.description ?? ""));
          const amount = Number(r.amount ?? 0);
          groupTotal += amount;
          let label = "";
          let qty = "";
          let rate = "";
          if (kind === "uren") {
            label = "Uren begeleiding";
            qty = `${Number(r.hours ?? 0).toFixed(2)} u`;
            rate = fmtMoney(Number(r.hourly_rate ?? 0));
          } else if (kind === "brandstof") {
            label = "Brandstoftoeslag";
          } else {
            label = safe(String(r.description ?? "Extra kosten").replace(/^Extra kosten:\s*/i, "Extra: "));
          }
          body.push([
            { content: label, styles: { cellPadding: { top: 2, bottom: 2, left: 6, right: 1 } } },
            { content: qty, styles: { halign: "right" } },
            { content: rate, styles: { halign: "right" } },
            { content: fmtMoney(amount), styles: { halign: "right" } },
          ]);
        }

        body.push([
          {
            content: "Subtotaal rit",
            colSpan: 3,
            styles: { halign: "right", fontStyle: "bold", textColor: 60, cellPadding: { top: 2, bottom: 4, left: 1, right: 1 } },
          },
          {
            content: fmtMoney(groupTotal),
            styles: { halign: "right", fontStyle: "bold", cellPadding: { top: 2, bottom: 4, left: 1, right: 1 } },
          },
        ]);
      }

      addInvoiceTable(doc, {
        startY: 105,
        head: [["Omschrijving", "Aantal", "Tarief", "Bedrag"]],
        body,
        theme: "plain",
        headStyles: {
          fontStyle: "bold",
          textColor: 20,
          lineWidth: { top: 0, bottom: 0.4, left: 0, right: 0 },
          lineColor: 20,
          fillColor: [255, 255, 255],
        },
        bodyStyles: {
          textColor: 30,
          lineWidth: { top: 0, bottom: 0.1, left: 0, right: 0 },
          lineColor: [220, 215, 205],
        },
        columnStyles: {
          1: { halign: "right", cellWidth: 22 },
          2: { halign: "right", cellWidth: 28 },
          3: { halign: "right", cellWidth: 32 },
        },
        styles: { fontSize: 9.5, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
        margin: { left: 18, right: 18 },
      });
    } else {
      subtotal = items.reduce((s, r) => s + Number(r.amount ?? 0), 0);
      type RideRef = { id: string; client_reference?: string | null };
      const ridesMeta = ((invoice as Record<string, unknown>).__rides ?? []) as RideRef[];
      const refById = new Map(ridesMeta.map((r) => [r.id, r.client_reference ?? ""]));

      type Row = Array<{ content: string; colSpan?: number; styles?: Record<string, unknown> } | string>;
      const body: Row[] = [];

      for (const r of items) {
        const ref = refById.get(String(r.ride_id)) || "";
        const route = safe(String(r.route ?? ""));
        const dateStr = fmtDate(String(r.ride_date));
        const headerParts = [`${dateStr}   ·   ${route}`];
        if (ref) headerParts.push(`ref. ${ref}`);
        const header = safe(headerParts.join("   ·   "));
        const numEsc = Number(r.num_escorts ?? 0);
        const fee = Number(r.amount ?? 0);
        // Bruto-bedrag waarover de app-fee (1,5%) is berekend.
        const grossBase = fee > 0 ? fee / 0.015 : 0;

        body.push([{
          content: header,
          colSpan: 4,
          styles: {
            fontStyle: "bold",
            fillColor: [242, 238, 230],
            textColor: 20,
            cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
          },
        }]);

        body.push([
          { content: `App-fee (${numEsc} ${numEsc === 1 ? "begeleider" : "begeleiders"})`, styles: { cellPadding: { top: 2, bottom: 2, left: 6, right: 1 } } },
          { content: `over ${fmtMoney(grossBase)}`, styles: { halign: "right", textColor: 100 } },
          { content: "1,5%", styles: { halign: "right" } },
          { content: fmtMoney(fee), styles: { halign: "right" } },
        ]);

        body.push([
          {
            content: "Subtotaal rit",
            colSpan: 3,
            styles: { halign: "right", fontStyle: "bold", textColor: 60, cellPadding: { top: 2, bottom: 4, left: 1, right: 1 } },
          },
          {
            content: fmtMoney(fee),
            styles: { halign: "right", fontStyle: "bold", cellPadding: { top: 2, bottom: 4, left: 1, right: 1 } },
          },
        ]);
      }

      addInvoiceTable(doc, {
        startY: 105,
        head: [["Omschrijving", "Grondslag", "Tarief", "Bedrag"]],
        body,
        theme: "plain",
        headStyles: {
          fontStyle: "bold",
          textColor: 20,
          lineWidth: { top: 0, bottom: 0.4, left: 0, right: 0 },
          lineColor: 20,
          fillColor: [255, 255, 255],
        },
        bodyStyles: {
          textColor: 30,
          lineWidth: { top: 0, bottom: 0.1, left: 0, right: 0 },
          lineColor: [220, 215, 205],
        },
        columnStyles: {
          1: { halign: "right", cellWidth: 36 },
          2: { halign: "right", cellWidth: 22 },
          3: { halign: "right", cellWidth: 32 },
        },
        styles: { fontSize: 9.5, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
        margin: { left: 18, right: 18 },
      });
    }

    // deno-lint-ignore no-explicit-any
    const endY = (doc as any).lastAutoTable.finalY as number;
    const vatRate = vatRateFor(from, to);
    const weroFee = from.wero_enabled ? Number(from.wero_fee || 0) : 0;
    const total = subtotal + subtotal * vatRate + weroFee;
    drawTotals(
      doc,
      endY + 12,
      subtotal,
      vatRate,
      total,
      weroFee,
      from.wero_enabled ? from.wero_handle ?? null : null,
    );
    drawFootNote(doc, shellOpts.invoice_number);

    const pdfBytes = doc.output("arraybuffer") as ArrayBuffer;
    const folder = type === "regular" ? "regular" : "platform";
    const path = `${folder}/${invoiceId}.pdf`;
    const xmlPath = `${folder}/${invoiceId}.xml`;

    // Build UBL 2.1 (Peppol BIS Billing 3.0) e-factuur XML.
    const xml = buildUblInvoice({
      type,
      invoice: invoice!,
      items,
      from,
      to,
      subtotal,
      vatRate,
    });

    const [{ error: upErr }, { error: xmlErr }] = await Promise.all([
      admin.storage.from("invoices").upload(path, new Uint8Array(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      }),
      admin.storage.from("invoices").upload(xmlPath, new TextEncoder().encode(xml), {
        contentType: "application/xml",
        upsert: true,
      }),
    ]);
    if (upErr) throw upErr;
    if (xmlErr) throw xmlErr;

    const table = type === "regular" ? "invoices" : "platform_invoices";
    await admin.from(table).update({ pdf_path: path, xml_path: xmlPath }).eq("id", invoiceId);

    if (isInternal) {
      return new Response(
        JSON.stringify({ pdf_path: path, xml_path: xmlPath, generated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: signed, error: signErr }, { data: signedXml, error: signXmlErr }] = await Promise.all([
      admin.storage.from("invoices").createSignedUrl(path, 60 * 10),
      admin.storage.from("invoices").createSignedUrl(xmlPath, 60 * 10),
    ]);
    if (signErr) throw signErr;
    if (signXmlErr) throw signXmlErr;

    return new Response(
      JSON.stringify({
        pdf_path: path,
        xml_path: xmlPath,
        signed_url: signed.signedUrl,
        xml_signed_url: signedXml.signedUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-invoice-pdf", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
