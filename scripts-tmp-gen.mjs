import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";

const fmtDate = (d) => new Date(d).toLocaleDateString("nl-NL", { dateStyle: "medium" });
const fmtMoney = (n) => `EUR ${Number(n).toFixed(2)}`;

const partyLines = (p) => [
  p.company_name || p.full_name || "",
  p.billing_contact_name || "",
  p.billing_address || "",
  [p.billing_postcode, p.billing_city].filter(Boolean).join(" "),
  p.billing_country || "",
  p.kvk_number ? `KvK ${p.kvk_number}` : "",
  p.vat_number ? `Btw ${p.vat_number}` : "",
  p.billing_email || "",
].filter(Boolean);

const drawHeader = (doc, opts, title) => {
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(40,30,20);
  doc.text(title, 20, 25);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(`Factuurnr.  ${opts.invoice_number}`, 20, 33);
  doc.text(`Datum         ${fmtDate(opts.created_at)}`, 20, 38);
  doc.text(`Periode       ${fmtDate(opts.period_start)} – ${fmtDate(opts.period_end)}`, 20, 43);
  doc.setFontSize(8); doc.setTextColor(120);
  doc.text("VAN", 20, 58); doc.text("AAN", 110, 58);
  doc.setFontSize(9); doc.setTextColor(40);
  partyLines(opts.from).forEach((l,i)=>doc.text(l,20,64+i*5));
  partyLines(opts.to).forEach((l,i)=>doc.text(l,110,64+i*5));
};
const drawFooter = (doc, party) => {
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(8); doc.setTextColor(120);
  const parts = [party.iban?`IBAN ${party.iban}`:null, party.bank_account_holder?`t.n.v. ${party.bank_account_holder}`:null].filter(Boolean);
  if (parts.length) doc.text(parts.join("  ·  "), 20, h-12);
  doc.text("Gegenereerd via Lowloads", 20, h-7);
};

// ---- Begeleider-factuur ----
{
  const doc = new jsPDF();
  const data = {
    invoice_number: "INV-20260427-9f3a02",
    created_at: "2026-04-27T10:00:00Z",
    period_start: "2026-04-20T00:00:00Z",
    period_end: "2026-04-26T23:59:59Z",
    from: { company_name:"De Vries Begeleiding VOF", billing_contact_name:"Jan de Vries", billing_address:"Havenweg 14", billing_postcode:"3071 AA", billing_city:"Rotterdam", billing_country:"Nederland", kvk_number:"81234567", vat_number:"NL003456789B01", billing_email:"jan@devries-begeleiding.nl", iban:"NL12 RABO 0123 4567 89", bank_account_holder:"J. de Vries" },
    to: { company_name:"Havenlogistiek Rotterdam BV", billing_contact_name:"Sandra Bosch", billing_address:"Maasvlakteweg 1", billing_postcode:"3199 LB", billing_city:"Rotterdam", billing_country:"Nederland", kvk_number:"24123456", vat_number:"NL001122334B01", billing_email:"facturen@havenlog.nl" },
    rows: [
      { ride_date:"2026-04-21", description:"Rotterdam → Duisburg", hours:5.0, hourly_rate:58, amount:290 },
      { ride_date:"2026-04-23", description:"Antwerpen → Eindhoven", hours:3.5, hourly_rate:58, amount:203 },
      { ride_date:"2026-04-25", description:"Brandstoftoeslag", hours:0, hourly_rate:0, amount:42 },
    ]
  };
  drawHeader(doc, data, "Factuur");
  const isFuel = (d) => /brandstof|fuel/i.test(d ?? "");
  const rideRows = data.rows.filter(r=>!isFuel(r.description));
  const fuelRows = data.rows.filter(r=>isFuel(r.description));
  const ridesSubtotal = rideRows.reduce((s,r)=>s+r.amount,0);
  const fuelSubtotal = fuelRows.reduce((s,r)=>s+r.amount,0);
  const subtotal = ridesSubtotal+fuelSubtotal, vat = subtotal*0.21, total = subtotal+vat;
  const body = [...rideRows.map(r=>[fmtDate(r.ride_date), r.description, r.hours.toFixed(2), fmtMoney(r.hourly_rate), fmtMoney(r.amount)])];
  if (fuelRows.length) {
    body.push(["", { content:"Subtotaal ritten", styles:{halign:"right",fontStyle:"bold"}}, "", "", fmtMoney(ridesSubtotal)]);
    fuelRows.forEach(r=>body.push([fmtDate(r.ride_date), r.description, r.hours.toFixed(2), fmtMoney(r.hourly_rate), fmtMoney(r.amount)]));
  }
  autoTable(doc, {
    startY:105,
    head:[["Datum","Omschrijving","Uren","Tarief","Bedrag"]],
    body,
    foot:[["","","","Subtotaal",fmtMoney(subtotal)],["","","","Btw 21%",fmtMoney(vat)],["","","","Totaal",fmtMoney(total)]],
    theme:"striped",
    headStyles:{fillColor:[60,45,30],textColor:245},
    footStyles:{fillColor:[245,240,230],textColor:30,fontStyle:"bold"},
    columnStyles:{2:{halign:"right"},3:{halign:"right"},4:{halign:"right"}},
    styles:{fontSize:9},
  });
  drawFooter(doc, data.from);
  fs.writeFileSync("/mnt/documents/voorbeeld-factuur-begeleider.pdf", Buffer.from(doc.output("arraybuffer")));
}

// ---- App-fee factuur ----
{
  const doc = new jsPDF();
  const data = {
    invoice_number: "PLAT-20260501-7b1c44",
    created_at: "2026-05-01T03:00:00Z",
    period_start: "2026-04-01T00:00:00Z",
    period_end: "2026-04-30T23:59:59Z",
    from: { company_name:"Lowloads B.V.", billing_address:"Mediavaert 1", billing_postcode:"1114 BC", billing_city:"Amsterdam-Duivendrecht", billing_country:"Nederland", kvk_number:"00000000", vat_number:"NL000000000B01", billing_email:"facturatie@lowloads.app" },
    to: { company_name:"Havenlogistiek Rotterdam BV", billing_contact_name:"Sandra Bosch", billing_address:"Maasvlakteweg 1", billing_postcode:"3199 LB", billing_city:"Rotterdam", billing_country:"Nederland", kvk_number:"24123456", vat_number:"NL001122334B01", billing_email:"facturen@havenlog.nl" },
    rows: [
      { ride_date:"2026-04-03", route:"Rotterdam → Duisburg", num_escorts:2, amount:5.00 },
      { ride_date:"2026-04-09", route:"Antwerpen → Eindhoven", num_escorts:1, amount:2.50 },
      { ride_date:"2026-04-14", route:"Vlissingen → Bremen", num_escorts:2, amount:5.00 },
      { ride_date:"2026-04-18", route:"Amsterdam → Utrecht", num_escorts:1, amount:2.50 },
      { ride_date:"2026-04-22", route:"Tilburg → Luik", num_escorts:2, amount:5.00 },
    ],
    total_amount: 20.00
  };
  drawHeader(doc, data, "App-fee factuur");
  autoTable(doc, {
    startY:105,
    head:[["Datum","Route","Begeleiders","Bedrag"]],
    body:data.rows.map(r=>[fmtDate(r.ride_date), r.route, r.num_escorts, fmtMoney(r.amount)]),
    foot:[["","","Totaal",fmtMoney(data.total_amount)]],
    theme:"striped",
    headStyles:{fillColor:[60,45,30],textColor:245},
    footStyles:{fillColor:[245,240,230],textColor:30,fontStyle:"bold"},
    columnStyles:{2:{halign:"right"},3:{halign:"right"}},
    styles:{fontSize:9},
  });
  drawFooter(doc, data.from);
  fs.writeFileSync("/mnt/documents/voorbeeld-factuur-appfee.pdf", Buffer.from(doc.output("arraybuffer")));
}
console.log("ok");
