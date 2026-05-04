import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtDate = (d: string) => new Date(d).toLocaleDateString("nl-NL", { dateStyle: "medium" });
const fmtMoney = (n: number) => `EUR ${Number(n).toFixed(2)}`;

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

const partyLines = (p: BillingParty) =>
  [
    p.company_name || p.full_name || "",
    p.billing_contact_name || "",
    p.billing_address || "",
    [p.billing_postcode, p.billing_city].filter(Boolean).join(" "),
    p.billing_country || "",
    p.kvk_number ? `KvK ${p.kvk_number}` : "",
    p.vat_number ? `Btw ${p.vat_number}` : "",
    p.billing_email || "",
  ].filter(Boolean);

const drawHeader = (doc: jsPDF, opts: BasePdfOpts, title: string) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 30, 20);
  doc.text(title, 20, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Factuurnr.  ${opts.invoice_number}`, 20, 33);
  doc.text(`Datum         ${fmtDate(opts.created_at)}`, 20, 38);
  doc.text(`Periode       ${fmtDate(opts.period_start)} – ${fmtDate(opts.period_end)}`, 20, 43);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("VAN", 20, 58);
  doc.text("AAN", 110, 58);

  doc.setFontSize(9);
  doc.setTextColor(40);
  partyLines(opts.from).forEach((l, i) => doc.text(l, 20, 64 + i * 5));
  partyLines(opts.to).forEach((l, i) => doc.text(l, 110, 64 + i * 5));
};

const drawFooter = (doc: jsPDF, party: BillingParty) => {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120);
  const parts = [
    party.iban ? `IBAN ${party.iban}` : null,
    party.bank_account_holder ? `t.n.v. ${party.bank_account_holder}` : null,
  ].filter(Boolean);
  if (parts.length) doc.text(parts.join("  ·  "), 20, h - 12);
  doc.text("Gegenereerd via Lowloads", 20, h - 7);
};

export interface EscortInvoicePdfData extends BasePdfOpts {
  rows: Array<{ ride_date: string; description: string | null; hours: number; hourly_rate: number; amount: number }>;
}

export const downloadEscortInvoicePdf = (data: EscortInvoicePdfData) => {
  const doc = new jsPDF();
  drawHeader(doc, data, "Factuur");

  const isFuel = (d: string | null) => /brandstof|fuel/i.test(d ?? "");
  const rideRows = data.rows.filter((r) => !isFuel(r.description));
  const fuelRows = data.rows.filter((r) => isFuel(r.description));
  const ridesSubtotal = rideRows.reduce((s, r) => s + Number(r.amount), 0);
  const fuelSubtotal = fuelRows.reduce((s, r) => s + Number(r.amount), 0);
  const subtotal = ridesSubtotal + fuelSubtotal;
  const vat = subtotal * 0.21;
  const total = subtotal + vat;

  const body: (string | number)[][] = [
    ...rideRows.map((r) => [
      fmtDate(r.ride_date),
      r.description ?? "",
      Number(r.hours).toFixed(2),
      fmtMoney(r.hourly_rate),
      fmtMoney(r.amount),
    ]),
  ];
  if (fuelRows.length) {
    body.push(["", { content: "Subtotaal ritten", styles: { halign: "right", fontStyle: "bold" } } as never, "", "", fmtMoney(ridesSubtotal)]);
    fuelRows.forEach((r) =>
      body.push([fmtDate(r.ride_date), r.description ?? "", Number(r.hours).toFixed(2), fmtMoney(r.hourly_rate), fmtMoney(r.amount)]),
    );
  }

  autoTable(doc, {
    startY: 105,
    head: [["Datum", "Omschrijving", "Uren", "Tarief", "Bedrag"]],
    body,
    foot: [
      ["", "", "", "Subtotaal", fmtMoney(subtotal)],
      ["", "", "", "Btw 21%", fmtMoney(vat)],
      ["", "", "", "Totaal", fmtMoney(total)],
    ],
    theme: "striped",
    headStyles: { fillColor: [60, 45, 30], textColor: 245 },
    footStyles: { fillColor: [245, 240, 230], textColor: 30, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    styles: { fontSize: 9 },
  });

  drawFooter(doc, data.from);
  doc.save(`${data.invoice_number}.pdf`);
};

export interface PlatformInvoicePdfData extends BasePdfOpts {
  rows: Array<{ ride_date: string; route: string | null; num_escorts: number; amount: number }>;
  total_amount: number;
}

export const downloadPlatformInvoicePdf = (data: PlatformInvoicePdfData) => {
  const doc = new jsPDF();
  drawHeader(doc, data, "App-fee factuur");

  autoTable(doc, {
    startY: 105,
    head: [["Datum", "Route", "Begeleiders", "Bedrag"]],
    body: data.rows.map((r) => [fmtDate(r.ride_date), r.route ?? "", r.num_escorts, fmtMoney(r.amount)]),
    foot: [["", "", "Totaal", fmtMoney(data.total_amount)]],
    theme: "striped",
    headStyles: { fillColor: [60, 45, 30], textColor: 245 },
    footStyles: { fillColor: [245, 240, 230], textColor: 30, fontStyle: "bold" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    styles: { fontSize: 9 },
  });

  drawFooter(doc, data.from);
  doc.save(`${data.invoice_number}.pdf`);
};
