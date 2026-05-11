// GPX export voor RDW ontheffing-routes.
// Gebruikt Google Geocoding (via edge function) zodat we ook street-level
// trajectbeschrijvingen herkennen — niet alleen plaatsnamen.

import { supabase } from "@/integrations/supabase/client";
import { isHighwayName } from "./permitGeo";
import type { PermitWaypoint } from "./permitParser";

interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  desc?: string;
}

interface QueueItem {
  name: string;
  desc?: string;
  query: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildQuery(name: string, hint?: string): string {
  // Voeg landhint toe zodat geocoder NL/BE bias krijgt.
  const lower = name.toLowerCase();
  if (lower.includes("nederland") || lower.includes("belgi") || lower.includes("duitsland")) {
    return name;
  }
  // hint kan wegbeheerder zijn (bv "Provincie Gelderland") — helpt context
  return hint ? `${name}, ${hint}, Nederland` : `${name}, Nederland`;
}

export async function buildRouteGeoPoints(
  origin: string,
  destination: string,
  waypoints: PermitWaypoint[],
): Promise<{ points: GeoPoint[]; skipped: string[] }> {
  const queue: QueueItem[] = [];
  const skipped: string[] = [];

  const enqueue = (name: string, desc?: string, hint?: string) => {
    if (!name || !name.trim()) return;
    if (isHighwayName(name)) {
      skipped.push(name);
      return;
    }
    queue.push({ name, desc, query: buildQuery(name, hint) });
  };

  enqueue(origin, "Vertrekpunt");
  for (const wp of waypoints) {
    const desc = [wp.wegbeheerder, wp.hm, wp.passagevoorwaarden]
      .filter(Boolean)
      .join(" · ");
    enqueue(wp.trajectbeschrijving, desc || undefined, wp.wegbeheerder);
  }
  enqueue(destination, "Eindbestemming");

  if (queue.length === 0) return { points: [], skipped };

  const { data, error } = await supabase.functions.invoke("google-geocode", {
    body: { queries: queue.map((q) => q.query), region: "nl" },
  });
  if (error) throw error;

  const results = (data?.results ?? []) as Array<{
    lat: number | null;
    lng: number | null;
    status: string;
  }>;

  const points: GeoPoint[] = [];
  for (let i = 0; i < queue.length; i++) {
    const r = results[i];
    const item = queue[i];
    if (!r || r.lat == null || r.lng == null) {
      skipped.push(item.name);
      continue;
    }
    const last = points[points.length - 1];
    if (last && Math.abs(last.lat - r.lat) < 1e-6 && Math.abs(last.lng - r.lng) < 1e-6) continue;
    points.push({ name: item.name, lat: r.lat, lng: r.lng, desc: item.desc });
  }

  return { points, skipped };
}

export async function buildGpx(
  routeName: string,
  origin: string,
  destination: string,
  waypoints: PermitWaypoint[],
): Promise<{ gpx: string; pointCount: number; skipped: string[] }> {
  const { points, skipped } = await buildRouteGeoPoints(origin, destination, waypoints);
  const now = new Date().toISOString();

  const wpts = points
    .map(
      (p) => `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${escapeXml(p.name)}</name>${p.desc ? `\n    <desc>${escapeXml(p.desc)}</desc>` : ""}
  </wpt>`,
    )
    .join("\n");

  const rtepts = points
    .map(
      (p) => `      <rtept lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">
        <name>${escapeXml(p.name)}</name>${p.desc ? `\n        <desc>${escapeXml(p.desc)}</desc>` : ""}
      </rtept>`,
    )
    .join("\n");

  const trkpts = points
    .map(
      (p) => `        <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}">
          <name>${escapeXml(p.name)}</name>
        </trkpt>`,
    )
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ViaCust" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${now}</time>
  </metadata>
${wpts}
  <rte>
    <name>${escapeXml(routeName)}</name>
${rtepts}
  </rte>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  return { gpx, pointCount: points.length, skipped };
}

export function downloadGpx(filename: string, gpx: string) {
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".gpx") ? filename : `${filename}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
