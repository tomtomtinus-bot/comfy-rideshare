// Haalt de route van een RDW-ontheffing op via het publieke DWO portaal en
// retourneert deze als GPX. Gebruikt geen authenticatie — DWO publiek portaal.
//
// Stappen:
//  1. GET /Exemption/RegisterExemptionRoute (sessiecookie ASP.NET_SessionId)
//  2. POST /Exemption/IsExemptionExists (warmt server-side state)
//  3. POST /Exemption/ShowExemptionDetails
//  4. POST /Exemption/ExemptionRouteLeftPanel
//  5. POST /Routes/GetExemptionRoutes -> JSON met routeSegmentList[].routeLinkList
//  6. Batched WFS GetFeature -> LineString-geometrie per LINK_ID (EPSG:28992)
//  7. Stitch in route-volgorde, RD-coords -> WGS84 -> GPX

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const BASE = "https://dwo.rdw.nl";

function rdToWgs84(x: number, y: number): [number, number] {
  // Approximate Schreutelkamp/Strang formule. Nauwkeurig ~0.25m binnen NL.
  const x0 = 155000, y0 = 463000;
  const dx = (x - x0) * 1e-5;
  const dy = (y - y0) * 1e-5;
  const Kp = [0, 2, 0, 2, 0, 2, 1, 4, 2, 4, 1];
  const Kq = [1, 0, 2, 1, 3, 2, 0, 0, 3, 1, 1];
  const Kpq = [3235.65389, -32.58297, -0.2475, -0.84978, -0.0655, -0.01709, -0.00738, 0.0053, -0.00039, 0.00033, -0.00012];
  const Lp = [1, 1, 1, 3, 1, 3, 0, 3, 1, 0, 2, 5];
  const Lq = [0, 0, 1, 0, 3, 1, 2, 3, 0, 2, 5, 0];
  const Lpq = [5260.52916, 105.94684, 2.45656, -0.81885, 0.05594, -0.05607, 0.01199, -0.00256, 0.00128, 0.00022, -0.00022, 0.00026];
  let phi = 52.15517440;
  let lam = 5.38720621;
  for (let i = 0; i < Kpq.length; i++) {
    phi += (Kpq[i] * Math.pow(dx, Kp[i]) * Math.pow(dy, Kq[i])) / 3600;
  }
  for (let i = 0; i < Lpq.length; i++) {
    lam += (Lpq[i] * Math.pow(dx, Lp[i]) * Math.pow(dy, Lq[i])) / 3600;
  }
  return [lam, phi]; // lon, lat
}

function buildGpx(coords: Array<[number, number]>, name: string): string {
  const now = new Date().toISOString();
  const pts = coords
    .map(([lon, lat]) => `      <trkpt lat="${lat.toFixed(7)}" lon="${lon.toFixed(7)}"/>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ViaCust" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${name}</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>${name}</name>
    <trkseg>
${pts}
    </trkseg>
  </trk>
</gpx>
`;
}

async function rdwFetch(
  url: string,
  init: RequestInit & { cookies?: string },
): Promise<{ res: Response; cookies: string }> {
  const headers = new Headers(init.headers);
  headers.set("User-Agent", UA);
  if (init.cookies) headers.set("Cookie", init.cookies);
  const res = await fetch(url, { ...init, headers, redirect: "manual" });
  // Combine existing cookies with new Set-Cookie (defensief: getSetCookie + raw entries)
  const setCookies: string[] = [];
  const fn = (res.headers as any).getSetCookie;
  if (typeof fn === "function") setCookies.push(...fn.call(res.headers));
  for (const [k, v] of res.headers.entries()) {
    if (k.toLowerCase() === "set-cookie" && !setCookies.includes(v)) setCookies.push(v);
  }
  console.log(`[rdw] ${init.method ?? "GET"} ${url.split("?")[0]} -> ${res.status}, set-cookies: ${setCookies.length}`);
  const jar = new Map<string, string>();
  if (init.cookies) {
    for (const part of init.cookies.split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k) jar.set(k, v.join("="));
    }
  }
  for (const sc of setCookies) {
    const first = sc.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
  }
  const cookies = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  return { res, cookies };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const exemptionId = String(body.exemptionId ?? "").trim();
    if (!/^\d{6,12}$/.test(exemptionId)) {
      return new Response(
        JSON.stringify({ error: "Geldig ontheffingsnummer (cijfers) vereist." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Sessie opbouwen — volg GET-redirects handmatig zodat alle cookies blijven
    let cookies = "";
    const initUrls = [
      `${BASE}/`,
      `${BASE}/ConsultRestrictions/ViewRestrictions`,
      `${BASE}/Exemption/RegisterExemptionRoute`,
    ];
    for (const url of initUrls) {
      let next: string | null = url;
      for (let hop = 0; hop < 5 && next; hop++) {
        const r = await rdwFetch(next, { method: "GET", cookies });
        cookies = r.cookies;
        await r.res.body?.cancel();
        if (r.res.status >= 300 && r.res.status < 400) {
          const loc = r.res.headers.get("location");
          next = loc ? new URL(loc, next).toString() : null;
        } else {
          break;
        }
      }
    }

    const xhrHeaders = {
      "X-Requested-With": "XMLHttpRequest",
      Referer: `${BASE}/Exemption/RegisterExemptionRoute`,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "application/json, text/javascript, */*; q=0.01",
    };

    // 2) IsExemptionExists
    {
      const r = await rdwFetch(`${BASE}/Exemption/IsExemptionExists`, {
        method: "POST",
        headers: xhrHeaders,
        body: `ExemptionID=${exemptionId}`,
        cookies,
      });
      cookies = r.cookies;
      const j = await r.res.json().catch(() => ({}));
      if (!j?.Data) {
        return new Response(
          JSON.stringify({ error: `Ontheffing ${exemptionId} niet gevonden bij RDW.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3) ShowExemptionDetails (warmt state)
    {
      const r = await rdwFetch(`${BASE}/Exemption/ShowExemptionDetails`, {
        method: "POST",
        headers: xhrHeaders,
        body: `Exemption_ID=${exemptionId}`,
        cookies,
      });
      cookies = r.cookies;
      await r.res.text();
    }

    // 4) ExemptionRouteLeftPanel
    {
      const r = await rdwFetch(`${BASE}/Exemption/ExemptionRouteLeftPanel`, {
        method: "POST",
        headers: xhrHeaders,
        body: `ExemptionID=${exemptionId}`,
        cookies,
      });
      cookies = r.cookies;
      await r.res.text();
    }

    // 5) GetExemptionRoutes
    const routesRes = await rdwFetch(`${BASE}/Routes/GetExemptionRoutes`, {
      method: "POST",
      headers: xhrHeaders,
      body: `ExemptionID=${exemptionId}`,
      cookies,
    });
    cookies = routesRes.cookies;
    const routesJson: any = await routesRes.res.json().catch(() => null);
    if (!routesJson?.value?.length) {
      return new Response(
        JSON.stringify({ error: "Geen route gevonden in RDW-respons." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verzamel segmenten (links + start/eind RD-punten voor exact trimmen)
    type Step = { linkId: number; direction: number };
    type Segment = {
      links: Step[];
      startPt: [number, number] | null;
      endPt: [number, number] | null;
    };
    const segments: Segment[] = [];
    const ptOf = (g: any): [number, number] | null => {
      const p = g?.sdo_point;
      if (!p || typeof p.X !== "number" || typeof p.Y !== "number") return null;
      return [p.X, p.Y];
    };
    for (const rp of routesJson.value) {
      for (const rpl of rp.routePathList ?? []) {
        for (const seg of rpl.routeSegmentList ?? []) {
          const links: Step[] = (seg.routeLinkList ?? []).map((rl: any) => ({
            linkId: rl.linkId,
            direction: rl.direction ?? 0,
          }));
          if (!links.length) continue;
          segments.push({
            links,
            startPt: ptOf(seg.startPointGeometry),
            endPt: ptOf(seg.endPointGeometry),
          });
        }
      }
    }
    const steps: Step[] = segments.flatMap((s) => s.links);
    if (!steps.length) {
      return new Response(
        JSON.stringify({ error: "Route bevat geen wegsegmenten." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Unieke linkIDs
    const uniqueIds = [...new Set(steps.map((s) => s.linkId))];

    // 6) WFS-batches (parallel, max 5 tegelijk, 150 IDs per batch)
    const BATCH = 150;
    const CONCURRENCY = 5;
    const geomMap = new Map<number, [number, number][]>();

    const batches: number[][] = [];
    for (let i = 0; i < uniqueIds.length; i += BATCH) {
      batches.push(uniqueIds.slice(i, i + BATCH));
    }

    const fetchBatch = async (ids: number[]) => {
      const cql = `LINK_ID IN (${ids.join(",")})`;
      const url =
        `${BASE}/geoserver/NWKMAP/wfs?request=GetFeature&typeName=NWKMAP:STREETS` +
        `&propertyName=LINK_ID,GEOM&outputFormat=application/json&version=1.0.0` +
        `&CQL_FILTER=${encodeURIComponent(cql)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`WFS HTTP ${res.status}`);
      const j = await res.json();
      for (const f of j.features ?? []) {
        const id = f.properties?.LINK_ID;
        const g = f.geometry;
        if (!id || !g) continue;
        if (g.type === "LineString") {
          geomMap.set(id, g.coordinates as [number, number][]);
        } else if (g.type === "MultiLineString") {
          // Pak de langste sub-line
          const longest = (g.coordinates as [number, number][][]).reduce((a, b) =>
            a.length >= b.length ? a : b
          );
          geomMap.set(id, longest);
        }
      }
    };

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      await Promise.all(batches.slice(i, i + CONCURRENCY).map(fetchBatch));
    }

    // 7) Stitch in routevolgorde + RD->WGS84
    const out: Array<[number, number]> = [];
    let lastKey = "";
    for (const step of steps) {
      const rd = geomMap.get(step.linkId);
      if (!rd) continue;
      const ordered = step.direction === 1 ? [...rd].reverse() : rd;
      for (const [x, y] of ordered) {
        const [lon, lat] = rdToWgs84(x, y);
        const key = `${lon.toFixed(6)},${lat.toFixed(6)}`;
        if (key === lastKey) continue;
        out.push([lon, lat]);
        lastKey = key;
      }
    }

    if (!out.length) {
      return new Response(
        JSON.stringify({ error: "Geen geometrieën opgehaald uit RDW WFS." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const gpx = buildGpx(out, `RDW ontheffing ${exemptionId}`);
    return new Response(
      JSON.stringify({
        gpx,
        filename: `rdw-route-${exemptionId}.gpx`,
        points: out.length,
        linksFetched: geomMap.size,
        linksTotal: uniqueIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("fetch-rdw-route error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message ?? "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
