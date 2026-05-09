// GPX export voor RDW ontheffing-routes.
// Output is GPX 1.1 met zowel <wpt> (waypoints) als een <rte> (route) zodat
// apps als MyRouteApp, Garmin BaseCamp, Komoot en Google Earth het kunnen lezen.

import { geocodeWaypoint, isHighwayName } from "./permitGeo";
import type { PermitWaypoint } from "./permitParser";

interface GeoPoint {
  name: string;
  lat: number;
  lng: number;
  desc?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRouteGeoPoints(
  origin: string,
  destination: string,
  waypoints: PermitWaypoint[],
): { points: GeoPoint[]; skipped: string[] } {
  const points: GeoPoint[] = [];
  const skipped: string[] = [];

  const tryAdd = (name: string, desc?: string) => {
    if (!name) return;
    if (isHighwayName(name)) {
      skipped.push(name);
      return;
    }
    const g = geocodeWaypoint(name);
    if (!g) {
      skipped.push(name);
      return;
    }
    const last = points[points.length - 1];
    if (last && last.lat === g.lat && last.lng === g.lng) return;
    points.push({ name, lat: g.lat, lng: g.lng, desc });
  };

  tryAdd(origin, "Vertrekpunt");
  for (const wp of waypoints) {
    const desc = [wp.wegbeheerder, wp.hm, wp.passagevoorwaarden]
      .filter(Boolean)
      .join(" · ");
    tryAdd(wp.trajectbeschrijving, desc || undefined);
  }
  tryAdd(destination, "Eindbestemming");

  return { points, skipped };
}

export function buildGpx(
  routeName: string,
  origin: string,
  destination: string,
  waypoints: PermitWaypoint[],
): { gpx: string; pointCount: number; skipped: string[] } {
  const { points, skipped } = buildRouteGeoPoints(origin, destination, waypoints);
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
      (p) => `    <rtept lat="${p.lat}" lon="${p.lng}">
      <name>${escapeXml(p.name)}</name>${p.desc ? `\n      <desc>${escapeXml(p.desc)}</desc>` : ""}
    </rtept>`,
    )
    .join("\n");

  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Comfy Rideshare" xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${now}</time>
  </metadata>
${wpts}
  <rte>
    <name>${escapeXml(routeName)}</name>
${rtepts}
  </rte>
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
