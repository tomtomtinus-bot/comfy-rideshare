import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@/assets/pilotcrew-logo.png";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { dateStyle: "short" });

let logoDataUrlCache: string | null = null;
const loadLogoDataUrl = async (): Promise<string | null> => {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
};
const fmtMoney = (n: number) =>
  `€ ${Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface BillingParty {
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
  bank_account_holder?: string | null;
  full_name?: string | null;
}

interface BasePdfOpts {
  invoice_number: string;
  created_at: string;
  period_start: string;
  period_end: string;
  from: BillingParty;
  to: BillingParty;
}

const senderBlock = (p: BillingParty) =>
  [
    [p.billing_address || "", false],
    [
      [p.billing_postcode, p.billing_city].filter(Boolean).join(" ") || "",
      false,
    ],
    ["", false],
    [p.iban ? `IBAN: ${p.iban}` : "", false],
    [p.vat_number ? `BTW: ${p.vat_number}` : "", false],
    [p.kvk_number ? `KVK: ${p.kvk_number}` : "", false],
  ].filter(([t]) => !!t) as [string, boolean][];

const recipientBlock = (p: BillingParty) =>
  [
    p.company_name || p.full_name || "",
    p.billing_contact_name || "",
    p.billing_address || "",
    [p.billing_postcode, p.billing_city].filter(Boolean).join(" "),
  ].filter(Boolean);

// --- shared header in Paashuis-style ---
const drawShell = (doc: jsPDF, opts: BasePdfOpts) => {
  const pageW = doc.internal.pageSize.getWidth();
  const left = 18;
  const right = pageW - 18;

  // Sender logo / name (top-left, large display)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(20);
  doc.text((opts.from.company_name || opts.from.full_name || "").toUpperCase(), left, 28);

  // Sender details (top-right, small)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40);
  let y = 22;
  const senderLines = senderBlock(opts.from).map(([t]) => t);
  // also include company name as first line on the right? In template only address shown right.
  senderLines.forEach((line) => {
    doc.text(line, right, y, { align: "right" });
    y += 4.5;
  });

  // Horizontal divider
  doc.setDrawColor(20);
  doc.setLineWidth(0.4);
  doc.line(left, 56, right, 56);

  // Recipient block (left)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Factuur:", left, 66);
  doc.setFont("helvetica", "normal");
  const rec = recipientBlock(opts.to);
  doc.setFont("helvetica", "bold");
  if (rec[0]) doc.text(rec[0], left, 76);
  doc.setFont("helvetica", "normal");
  rec.slice(1).forEach((line, i) => doc.text(line, left, 82 + i * 5));

  // Meta block (right)
  const metaX = pageW - 80;
  const metaValX = right;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Factuurdatum:", metaX, 66);
  doc.text(fmtDate(opts.created_at), metaValX, 66, { align: "right" });
  doc.text("Factuurnummer:", metaX, 72);
  doc.text(opts.invoice_number, metaValX, 72, { align: "right" });
  doc.text("Betalingsconditie:", metaX, 78);
  doc.text("30 dagen", metaValX, 78, { align: "right" });
  doc.text("Periode:", metaX, 84);
  doc.text(`${fmtDate(opts.period_start)} – ${fmtDate(opts.period_end)}`, metaValX, 84, {
    align: "right",
  });
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

const drawTotals = (
  doc: jsPDF,
  startY: number,
  subtotal: number,
  vatRate: number,
  total: number,
) => {
  const pageW = doc.internal.pageSize.getWidth();
  const right = pageW - 18;
  const labelX = pageW - 80;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20);

  doc.text("Totaal:", labelX, startY);
  doc.text(fmtMoney(subtotal), right, startY, { align: "right" });

  doc.text("BTW:", labelX, startY + 6);
  doc.text(`${(vatRate * 100).toFixed(0)}%`, labelX + 30, startY + 6);
  doc.text(fmtMoney(subtotal * vatRate), right, startY + 6, { align: "right" });

  doc.setDrawColor(20);
  doc.setLineWidth(0.3);
  doc.line(labelX, startY + 10, right, startY + 10);

  doc.setFont("helvetica", "bold");
  doc.text("Totaal te voldoen:", labelX, startY + 16);
  doc.text(fmtMoney(total), right, startY + 16, { align: "right" });
};

// ============ Begeleider invoice ============
export interface EscortInvoicePdfData extends BasePdfOpts {
  rows: Array<{
    ride_date: string;
    description: string | null;
    hours: number;
    hourly_rate: number;
    amount: number;
  }>;
}

export const downloadEscortInvoicePdf = (data: EscortInvoicePdfData) => {
  const doc = new jsPDF();
  drawShell(doc, data);

  const subtotal = data.rows.reduce((s, r) => s + Number(r.amount), 0);
  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  autoTable(doc, {
    startY: 105,
    head: [["Datum", "Omschrijving", "Aantal", "Prijs", "Totaal"]],
    body: data.rows.map((r) => [
      fmtDate(r.ride_date),
      r.description ?? "",
      Number(r.hours).toFixed(2),
      fmtMoney(r.hourly_rate),
      fmtMoney(r.amount),
    ]),
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
      lineColor: [200, 200, 200],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 32 },
    },
    styles: { fontSize: 9.5, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
    margin: { left: 18, right: 18 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endY = (doc as any).lastAutoTable.finalY as number;
  drawTotals(doc, endY + 12, subtotal, 0.21, total);
  drawFootNote(doc, data.invoice_number);
  doc.save(`${data.invoice_number}.pdf`);
};

// ============ Platform app-fee invoice ============
export interface PlatformInvoicePdfData extends BasePdfOpts {
  rows: Array<{
    ride_date: string;
    route: string | null;
    num_escorts: number;
    amount: number;
  }>;
  total_amount: number;
}

export const downloadPlatformInvoicePdf = (data: PlatformInvoicePdfData) => {
  const doc = new jsPDF();
  drawShell(doc, data);

  const subtotal = data.total_amount;
  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  autoTable(doc, {
    startY: 105,
    head: [["Datum", "Omschrijving", "Aantal", "Prijs", "Totaal"]],
    body: data.rows.map((r) => [
      fmtDate(r.ride_date),
      `App-fee rit ${r.route ?? ""}`.trim(),
      String(r.num_escorts),
      fmtMoney(2.5),
      fmtMoney(r.amount),
    ]),
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
      lineColor: [200, 200, 200],
    },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: "right", cellWidth: 22 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "right", cellWidth: 32 },
    },
    styles: { fontSize: 9.5, cellPadding: { top: 2.5, bottom: 2.5, left: 1, right: 1 } },
    margin: { left: 18, right: 18 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const endY = (doc as any).lastAutoTable.finalY as number;
  drawTotals(doc, endY + 12, subtotal, 0.21, total);
  drawFootNote(doc, data.invoice_number);
  doc.save(`${data.invoice_number}.pdf`);
};
