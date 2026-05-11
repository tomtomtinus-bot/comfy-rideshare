// Geocode helper voor ontheffing-waypoints.
// Combineert onze bestaande NL-stedenlijst met snelweg-knooppunten en bekende locatienamen.

import { CITIES, geocode as geocodeCity, type GeoPoint } from "./geo";

// Bekende NL snelweg-knooppunten en locaties die vaak in RDW-routes voorkomen.
const EXTRA: GeoPoint[] = [
  { city: "Knooppunt Beekbergen", country: "Nederland", lat: 52.123, lng: 5.998 },
  { city: "Knooppunt Hattemerbroek", country: "Nederland", lat: 52.482, lng: 5.992 },
  { city: "Knooppunt Lunetten", country: "Nederland", lat: 52.057, lng: 5.137 },
  { city: "Knooppunt Oudenrijn", country: "Nederland", lat: 52.072, lng: 5.054 },
  { city: "Knooppunt Ridderkerk", country: "Nederland", lat: 51.871, lng: 4.583 },
  { city: "Knooppunt Vaanplein", country: "Nederland", lat: 51.852, lng: 4.541 },
  { city: "Knooppunt Hoogvliet", country: "Nederland", lat: 51.866, lng: 4.391 },
  { city: "Knooppunt Benelux", country: "Nederland", lat: 51.886, lng: 4.382 },
  { city: "De Lutte", country: "Nederland", lat: 52.317, lng: 7.001 },
  { city: "Oldenzaal", country: "Nederland", lat: 52.314, lng: 6.929 },
  { city: "Hengelo", country: "Nederland", lat: 52.265, lng: 6.793 },
  { city: "Deventer", country: "Nederland", lat: 52.255, lng: 6.163 },
  { city: "Apeldoorn", country: "Nederland", lat: 52.211, lng: 5.969 },
  { city: "Tegelen", country: "Nederland", lat: 51.336, lng: 6.146 },
  { city: "Venlo", country: "Nederland", lat: 51.370, lng: 6.172 },
  { city: "Eindhoven", country: "Nederland", lat: 51.441, lng: 5.469 },
  { city: "Tilburg", country: "Nederland", lat: 51.555, lng: 5.091 },
  { city: "Breda", country: "Nederland", lat: 51.571, lng: 4.768 },
  { city: "Bergen op Zoom", country: "Nederland", lat: 51.495, lng: 4.287 },
  { city: "Goes", country: "Nederland", lat: 51.503, lng: 3.890 },
  { city: "Middelburg", country: "Nederland", lat: 51.499, lng: 3.610 },
  { city: "Vlissingen", country: "Nederland", lat: 51.443, lng: 3.573 },
  { city: "Voltaweg, Vlissingen", country: "Nederland", lat: 51.451, lng: 3.643 },
  { city: "Zutphensestraat", country: "Nederland", lat: 52.180, lng: 6.042 },
];

// Bekende grensovergangen NL ↔ DE / BE. Deze worden vóór losse plaatsen gematched
// zodat 'Tegelen / Kaldenkirchen' niet in Tegelen op de kaart belandt.
const BORDER_CROSSINGS: GeoPoint[] = [
  { city: "Tegelen Kaldenkirchen", country: "Grens NL/DE", lat: 51.328, lng: 6.187 },
  { city: "Venlo Kaldenkirchen", country: "Grens NL/DE", lat: 51.346, lng: 6.198 },
  { city: "De Lutte Bad Bentheim", country: "Grens NL/DE", lat: 52.310, lng: 7.034 },
  { city: "Oldenzaal Bad Bentheim", country: "Grens NL/DE", lat: 52.310, lng: 7.034 },
  { city: "Denekamp Nordhorn", country: "Grens NL/DE", lat: 52.391, lng: 7.024 },
  { city: "Enschede Gronau", country: "Grens NL/DE", lat: 52.218, lng: 6.971 },
  { city: "Winterswijk Vreden", country: "Grens NL/DE", lat: 51.971, lng: 6.762 },
  { city: "Zevenaar Elten", country: "Grens NL/DE", lat: 51.880, lng: 6.131 },
  { city: "Beek Wyler", country: "Grens NL/DE", lat: 51.829, lng: 5.982 },
  { city: "Heerlen Aachen", country: "Grens NL/DE", lat: 50.866, lng: 6.026 },
  { city: "Vaals Aachen", country: "Grens NL/DE", lat: 50.776, lng: 6.045 },
  { city: "Hazeldonk Meer", country: "Grens NL/BE", lat: 51.448, lng: 4.737 },
  { city: "Wuustwezel Hazeldonk", country: "Grens NL/BE", lat: 51.448, lng: 4.737 },
  { city: "Putte Stabroek", country: "Grens NL/BE", lat: 51.379, lng: 4.401 },
  { city: "Hoogerheide Putte", country: "Grens NL/BE", lat: 51.378, lng: 4.398 },
  { city: "Eijsden Visé", country: "Grens NL/BE", lat: 50.781, lng: 5.700 },
  { city: "Maastricht Visé", country: "Grens NL/BE", lat: 50.781, lng: 5.700 },
  { city: "Wernhout Brecht", country: "Grens NL/BE", lat: 51.456, lng: 4.690 },
  { city: "Hulst Antwerpen", country: "Grens NL/BE", lat: 51.279, lng: 4.054 },
];

const ALL = [...BORDER_CROSSINGS, ...EXTRA, ...CITIES];

// Probeer een snelweg-naam te herkennen — we tonen geen losse snelweg op de kaart maar
// wel de plaatsen die er aan grenzen via de andere waypoints.
const HIGHWAY_RE = /^A\d{1,3}(\/A\d{1,3})?$/i;

export function isHighwayName(s: string): boolean {
  return HIGHWAY_RE.test(s.trim());
}

// Normaliseer scheidingstekens (/, -, –, en) naar spaties zodat we
// 'Tegelen/Kaldenkirchen', 'Tegelen - Kaldenkirchen' enz. herkennen.
const normalize = (s: string) =>
  s.toLowerCase().replace(/[\/\-–—]|(\b(en|and)\b)/g, " ").replace(/\s+/g, " ").trim();

export function geocodeWaypoint(name: string): GeoPoint | null {
  if (!name) return null;
  const q = normalize(name);

  // 1) Grensovergangen eerst — exact of als beide plaatsnamen voorkomen
  for (const bc of BORDER_CROSSINGS) {
    const parts = bc.city.toLowerCase().split(" ").filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => q.includes(p))) return bc;
  }

  // 2) Exacte plaatsnaam
  const exact = ALL.find((c) => c.city.toLowerCase() === q);
  if (exact) return exact;

  // 3) Bevat een bekende plaats (langste match eerst → vermijdt 'Tegelen' in 'Tegelen Kaldenkirchen')
  const sorted = [...ALL].sort((a, b) => b.city.length - a.city.length);
  const partial = sorted.find((c) => q.includes(c.city.toLowerCase()));
  if (partial) return partial;

  return geocodeCity(name);
}
