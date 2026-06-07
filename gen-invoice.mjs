import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";

const logoBuf = fs.readFileSync("src/assets/viacust-logo.png");
const logoDataUrl = "data:image/png;base64," + logoBuf.toString("base64");

const fmtDate = (d) => new Date(d).toLocaleDateString("nl-NL");
const fmtMoney = (n) => `€ ${Number(n).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const from = { company_name:"Peter de Vries Begeleiding", billing_contact_name:"Peter de Vries", billing_address:"Hoofdstraat 12", billing_postcode:"3811 AB", billing_city:"Amersfoort", iban:"NL12 RABO 0123 4567 89", vat_number:"NL001234567B01", kvk_number:"12345678" };
const to = { company_name:"Transport Logistics BV", billing_contact_name:"Mevr. J. Janssen", billing_address:"Industrieweg 88", billing_postcode:"1101 CD", billing_city:"Amsterdam" };

const rows = [
  { ride_date:"2026-05-20", description:"Begeleiding exceptioneel transport A2 Utrecht→Eindhoven", reference:"RIT-2026-051", hours:4.5, hourly_rate:65, amount:292.50 },
  { ride_date:"2026-05-22", description:"Begeleiding lange lading N50 Zwolle→Kampen", reference:"RIT-2026-052", hours:3.0, hourly_rate:65, amount:195.00 },
  { ride_date:"2026-05-27", description:"Nachtrit begeleiding A1 Apeldoorn→Hengelo", reference:"RIT-2026-058", hours:6.25, hourly_rate:75, amount:468.75 },
  { ride_date:"2026-05-30", description:"Begeleiding kraan Rotterdam haven→Botlek", reference:"RIT-2026-061", hours:2.5, hourly_rate:65, amount:162.50 },
];
const opts = { invoice_number:"F-2026-014", created_at:"2026-06-01", period_start:"2026-05-16", period_end:"2026-05-31" };

const doc = new jsPDF();
const pageW = doc.internal.pageSize.getWidth();
const left = 18, right = pageW - 18;

// Brand lockup
const logoSize = 22;
doc.addImage(logoDataUrl, "PNG", left, 12, logoSize, logoSize);
const textX = left + logoSize + 4;
doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(26,42,68);
doc.text("ViaCust", textX, 24);
doc.setFontSize(7.5); doc.setTextColor(245,158,11); doc.setCharSpace(0.6);
doc.text("DIGITAL ESCORT SOLUTIONS", textX, 30);
doc.setCharSpace(0);
const headerBottom = 12 + logoSize;

// Sender right
doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(26,42,68);
let y = 18;
doc.setFont("helvetica","bold");
doc.text(from.company_name, right, y, { align:"right" }); y+=5;
doc.setFont("helvetica","normal");
[from.billing_contact_name, from.billing_address, `${from.billing_postcode} ${from.billing_city}`, "", `IBAN: ${from.iban}`, `BTW: ${from.vat_number}`, `KVK: ${from.kvk_number}`].filter(Boolean).forEach(l=>{doc.text(l,right,y,{align:"right"}); y+=4.5;});

const dividerY = Math.max(headerBottom+4, y+2, 50);
doc.setDrawColor(245,158,11); doc.setLineWidth(1.2); doc.line(left,dividerY,right,dividerY);
doc.setDrawColor(26,42,68); doc.setLineWidth(0.2); doc.line(left,dividerY+1.6,right,dividerY+1.6);

const blockY = dividerY + 10;
doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(26,42,68);
doc.text("Factuur:", left, blockY);
doc.text(to.company_name, left, blockY+10);
doc.setFont("helvetica","normal");
[to.billing_contact_name, to.billing_address, `${to.billing_postcode} ${to.billing_city}`].forEach((l,i)=>doc.text(l,left,blockY+16+i*5));

const metaX = pageW - 80;
doc.setFontSize(9);
doc.text("Factuurdatum:", metaX, blockY); doc.text(fmtDate(opts.created_at), right, blockY, {align:"right"});
doc.text("Factuurnummer:", metaX, blockY+6); doc.text(opts.invoice_number, right, blockY+6, {align:"right"});
doc.text("Betalingsconditie:", metaX, blockY+12); doc.text("30 dagen", right, blockY+12, {align:"right"});
doc.text("Periode:", metaX, blockY+18); doc.text(`${fmtDate(opts.period_start)} – ${fmtDate(opts.period_end)}`, right, blockY+18, {align:"right"});

const subtotal = rows.reduce((s,r)=>s+r.amount,0);
const vat = subtotal*0.21; const total = subtotal+vat;

autoTable(doc, {
  startY: blockY + 32,
  head: [["Datum","Omschrijving","Referentie","Aantal","Prijs","Totaal"]],
  body: rows.map(r=>[fmtDate(r.ride_date), r.description, r.reference, r.hours.toFixed(2), fmtMoney(r.hourly_rate), fmtMoney(r.amount)]),
  theme:"plain",
  headStyles:{ fontStyle:"bold", textColor:[26,42,68], lineWidth:{top:0,bottom:0.4,left:0,right:0}, lineColor:[26,42,68], fillColor:[255,255,255] },
  bodyStyles:{ textColor:[30,30,30], lineWidth:{top:0,bottom:0.1,left:0,right:0}, lineColor:[200,200,200] },
  columnStyles:{ 0:{cellWidth:22}, 2:{cellWidth:28}, 3:{halign:"right",cellWidth:18}, 4:{halign:"right",cellWidth:24}, 5:{halign:"right",cellWidth:28} },
  styles:{ fontSize:9.5, cellPadding:{top:2.5,bottom:2.5,left:1,right:1} },
  margin:{left:18,right:18},
});

const endY = doc.lastAutoTable.finalY;
let ty = endY + 12; const labelX = pageW - 80;
doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(26,42,68);
doc.text("Subtotaal:", labelX, ty); doc.text(fmtMoney(subtotal), right, ty, {align:"right"}); ty+=6;
doc.text("BTW:", labelX, ty); doc.text("21%", labelX+30, ty); doc.text(fmtMoney(vat), right, ty, {align:"right"}); ty+=6;
doc.setDrawColor(26,42,68); doc.setLineWidth(0.3); doc.line(labelX,ty,right,ty); ty+=6;
doc.setFont("helvetica","bold");
doc.text("Totaal te voldoen:", labelX, ty); doc.text(fmtMoney(total), right, ty, {align:"right"});

const h = doc.internal.pageSize.getHeight();
doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(80);
doc.text(`Bij betaling factuurnummer vermelden:  ${opts.invoice_number}`, pageW/2, h-18, {align:"center"});
doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(140);
doc.text("Gegenereerd via ViaCust", pageW/2, h-12, {align:"center"});

fs.writeFileSync("/mnt/documents/voorbeeldfactuur_v2.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("OK");
