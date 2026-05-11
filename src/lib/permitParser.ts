// RDW Ontheffing PDF parser
// Leest een RDW ontheffing-PDF uit en extraheert metadata + routes met waypoints.
// Pattern-based, geen AI. Werkt met de standaard RDW layout (versie 1.0.0.x).

// Gebruik de legacy build voor bredere browser-compat (o.a. oudere iOS Safari).
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
// Vite worker import
// @ts-ignore
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PermitWaypoint {
  wegbeheerder?: string;
  trajectbeschrijving: string;
  hm?: string;
  begeleiders?: string;
  passagevoorwaarden?: string;
}

export interface PermitRoute {
  routeIndex: number;
  loaded: boolean;
  origin: string;
  destination: string;
  waypoints: PermitWaypoint[];
}

export interface ParsedPermit {
  permitNumber: string;
  reference?: string;
  carrier?: string;
  cargo?: string;
  validFrom?: string; // YYYY-MM-DD
  validTo?: string;
  maxLengthM?: number;
  maxWidthM?: number;
  maxHeightM?: number;
  maxWeightKg?: number;
  routes: PermitRoute[];
}

interface PageItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

async function readPdfItems(file: ArrayBuffer): Promise<PageItem[]> {
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(file),
    disableStream: true,
    disableAutoFetch: true,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  const items: PageItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items as any[]) {
      const tr = it.transform; // [a, b, c, d, e, f] => x = e, y = f
      const str = (it.str ?? "").toString();
      if (!str.trim()) continue;
      items.push({ str, x: tr[4], y: tr[5], page: p });
    }
  }
  return items;
}

// Group items into rows by (page, y) and sort columns by x
function itemsByRow(items: PageItem[]) {
  const rowsByPage = new Map<number, Map<number, PageItem[]>>();
  for (const it of items) {
    if (!rowsByPage.has(it.page)) rowsByPage.set(it.page, new Map());
    const map = rowsByPage.get(it.page)!;
    // bin Y to 2px to merge same-line fragments
    const yKey = Math.round(it.y / 2) * 2;
    if (!map.has(yKey)) map.set(yKey, []);
    map.get(yKey)!.push(it);
  }
  // Returns ordered rows: page asc, y desc (PDF y is bottom-up, so higher y = top of page)
  const result: { page: number; y: number; items: PageItem[] }[] = [];
  for (const [page, map] of [...rowsByPage.entries()].sort((a, b) => a[0] - b[0])) {
    const yKeys = [...map.keys()].sort((a, b) => b - a);
    for (const y of yKeys) {
      const arr = map.get(y)!.sort((a, b) => a.x - b.x);
      result.push({ page, y, items: arr });
    }
  }
  return result;
}

function rowText(items: PageItem[], joiner = " "): string {
  return items.map((i) => i.str).join(joiner).replace(/\s+/g, " ").trim();
}

function parseDateNL(s: string): string | undefined {
  // 20-4-2026 of 20/04/2026
  const m = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return undefined;
  const [, d, mo, y] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : undefined;
}

export async function parsePermitPdf(file: File | ArrayBuffer): Promise<ParsedPermit> {
  const buf = file instanceof File ? await file.arrayBuffer() : file;
  const items = await readPdfItems(buf);
  const rows = itemsByRow(items);

  // Build full text for header lookups (page 1-2)
  const pageText = (p: number) =>
    rows
      .filter((r) => r.page === p)
      .map((r) => rowText(r.items))
      .join("\n");

  const text1 = pageText(1);

  // Permit number
  const permitNumber =
    text1.match(/Ontheffingnummer\s*\n?\s*(\d{6,})/i)?.[1] ||
    text1.match(/Referentie:\s*(\d{6,})/i)?.[1] ||
    "";

  const reference = text1.match(/Uw referentie\s*\n?\s*([^\n]+)/i)?.[1]?.trim();

  // Geldigheid: Vanaf / Tot en met (twee datums)
  const validBlock = text1.match(/Geldigheid[\s\S]{0,200}?(\d{1,2}[-/]\d{1,2}[-/]\d{4})[\s\S]{0,40}?(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i);
  const validFrom = validBlock ? parseDateNL(validBlock[1]) : undefined;
  const validTo = validBlock ? parseDateNL(validBlock[2]) : undefined;

  // Vervoerder (eerste regel onder kop "Vervoerder")
  const carrierMatch = text1.match(/Vervoerder\s*\n([^\n]+)/i);
  const carrier = carrierMatch?.[1]?.replace(/\s{2,}/g, " ").trim();

  // Lading
  const cargoMatch = text1.match(/Lading\s*\n([^\n]+)/i);
  const cargo = cargoMatch?.[1]?.replace(/\s{2,}/g, " ").trim();

  // Afmetingen — pak getallen na "Beladen" kolom (laatste num op de regel)
  const lengthMatch = text1.match(/Max lengte[^\n]*\n?[^\n]*?([\d,]+)\s*$/im);
  const widthMatch = text1.match(/Max breedte[^\n]*\n?[^\n]*?([\d,]+)\s*$/im);
  const heightMatch = text1.match(/Max hoogte[^\n]*\n?[^\n]*?([\d,]+)\s*$/im);
  const weightMatch = text1.match(/Max massa[^\n]*\n?[^\n]*?(\d[\d.,]*)\s*$/im);

  // Routes parsing — vind elke "Route N" sectie
  // Gebruik rows i.p.v. losse text omdat de tabel goed in rijen ligt
  const routes: PermitRoute[] = [];

  // Find the indices of route headers
  const routeHeaders: { idx: number; routeIndex: number; loaded: boolean }[] = [];
  rows.forEach((r, idx) => {
    const t = rowText(r.items);
    const m = t.match(/^Route\s+(\d+)\b/i);
    if (m) {
      const loaded = /Beladen/i.test(t) && !/Onbeladen/i.test(t);
      routeHeaders.push({ idx, routeIndex: parseInt(m[1], 10), loaded });
    }
  });

  for (let h = 0; h < routeHeaders.length; h++) {
    const head = routeHeaders[h];
    const nextIdx = h + 1 < routeHeaders.length ? routeHeaders[h + 1].idx : rows.length;
    const sectionRows = rows.slice(head.idx, nextIdx);

    // Origin/destination uit "Vertrek:" en "Bestemming:" of de header zelf
    let origin = "";
    let destination = "";
    for (let i = 0; i < Math.min(sectionRows.length, 8); i++) {
      const t = rowText(sectionRows[i].items);
      const vm = t.match(/Vertrek:\s*(.+?)(?:\s{2,}|$)/i);
      const bm = t.match(/Bestemming:\s*(.+?)(?:\s{2,}|$)/i);
      if (vm) origin = vm[1].split(/\s{2,}/)[0].trim();
      if (bm) destination = bm[1].split(/\s{2,}/)[0].trim();
    }

    // Waypoints: rijen met traject-info. We zoeken rijen met meerdere kolommen (x-spreiding).
    // De RDW tabel heeft kolommen: Wegbeheerder | Trajectbeschrijving | HM | Begeleiders | Passagevoorwaarden
    const waypoints: PermitWaypoint[] = [];
    let lastWegbeheerder = "";

    for (const row of sectionRows) {
      const text = rowText(row.items);
      // Skip headers / footer / pagenummers
      if (
        /^(Bijlage|Beperking|Voorschriften|Wegbeheerder|HM|Begeleiders|Passagevoorwaarden|Postbus|Telefoon|www\.rdw|Blad\s+\d+|Referentie:|Route\s+\d+|Vertrek:|Bestemming:|Max\s+(lengte|breedte|hoogte|massa))/i.test(
          text
        )
      ) {
        continue;
      }
      if (text.length < 2) continue;

      // Detecteer kolommen op basis van x-positie
      // Klassieke RDW page width ~ 600pt. Wegbeheerder kolom < 130, traject 130-310, hm 310-360, beg 360-430, pass 430+
      const cols: { wb: string[]; tj: string[]; hm: string[]; bg: string[]; pv: string[] } = {
        wb: [], tj: [], hm: [], bg: [], pv: [],
      };
      for (const it of row.items) {
        if (it.x < 130) cols.wb.push(it.str);
        else if (it.x < 310) cols.tj.push(it.str);
        else if (it.x < 365) cols.hm.push(it.str);
        else if (it.x < 435) cols.bg.push(it.str);
        else cols.pv.push(it.str);
      }
      const wb = cols.wb.join(" ").trim();
      const tj = cols.tj.join(" ").trim();
      const hm = cols.hm.join(" ").trim();
      const bg = cols.bg.join(" ").trim();
      const pv = cols.pv.join(" ").trim();

      // Een echte traject-rij heeft minstens een trajectbeschrijving
      if (!tj) continue;
      // Filter rijen die geen weg/locatie zijn
      if (/^(kunstwerken kunt u vinden|HM\s*=|Voor passage)/i.test(tj)) continue;

      if (wb) lastWegbeheerder = wb;

      waypoints.push({
        wegbeheerder: wb || lastWegbeheerder || undefined,
        trajectbeschrijving: tj,
        hm: hm || undefined,
        begeleiders: bg || undefined,
        passagevoorwaarden: pv || undefined,
      });
    }

    if (waypoints.length || origin || destination) {
      routes.push({
        routeIndex: head.routeIndex,
        loaded: head.loaded,
        origin: origin || (waypoints[0]?.trajectbeschrijving ?? ""),
        destination: destination || (waypoints[waypoints.length - 1]?.trajectbeschrijving ?? ""),
        waypoints,
      });
    }
  }

  return {
    permitNumber: permitNumber.trim(),
    reference,
    carrier,
    cargo,
    validFrom,
    validTo,
    maxLengthM: parseNum(lengthMatch?.[1]),
    maxWidthM: parseNum(widthMatch?.[1]),
    maxHeightM: parseNum(heightMatch?.[1]),
    maxWeightKg: parseNum(weightMatch?.[1]),
    routes,
  };
}
