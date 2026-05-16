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
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text("Verstuurd via viacust.app", left, 44);

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
  doc.text(`${fmtDate(opts.period_start)} – ${fmtDate(opts.period_end)}`, right, 84, {
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
            label = String(r.description ?? "Extra kosten").replace(/^Extra kosten:\s*/i, "Extra: ");
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
      subtotal = Number(invoice!.total_amount ?? 0);
      type RideRef = { id: string; client_reference?: string | null };
      const ridesMeta = ((invoice as Record<string, unknown>).__rides ?? []) as RideRef[];
      const refById = new Map(ridesMeta.map((r) => [r.id, r.client_reference ?? ""]));

      addInvoiceTable(doc, {
        startY: 105,
        head: [["Datum", "Rit", "Begeleiders", "Tarief", "App-fee"]],
        body: items.map((r) => {
          const ref = refById.get(String(r.ride_id)) || "";
          const route = String(r.route ?? "");
          const desc = ref ? `${route}\nref. ${ref}` : route;
          return [
            fmtDate(String(r.ride_date)),
            { content: desc, styles: { fontStyle: "normal" } },
            { content: String(r.num_escorts ?? 0), styles: { halign: "right" } },
            { content: "1,5%", styles: { halign: "right" } },
            { content: fmtMoney(Number(r.amount ?? 0)), styles: { halign: "right" } },
          ];
        }),
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
          0: { cellWidth: 22 },
          2: { halign: "right", cellWidth: 24 },
          3: { halign: "right", cellWidth: 22 },
          4: { halign: "right", cellWidth: 32 },
        },
        styles: { fontSize: 9.5, cellPadding: { top: 3, bottom: 3, left: 1, right: 1 } },
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

    const { error: upErr } = await admin.storage
      .from("invoices")
      .upload(path, new Uint8Array(pdfBytes), {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw upErr;

    const table = type === "regular" ? "invoices" : "platform_invoices";
    await admin.from(table).update({ pdf_path: path }).eq("id", invoiceId);

    if (isInternal) {
      return new Response(
        JSON.stringify({ pdf_path: path, generated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: signed, error: signErr } = await admin.storage
      .from("invoices")
      .createSignedUrl(path, 60 * 10);
    if (signErr) throw signErr;

    return new Response(
      JSON.stringify({ pdf_path: path, signed_url: signed.signedUrl }),
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
