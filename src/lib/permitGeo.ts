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

const ALL = [...EXTRA, ...CITIES];

// Probeer een snelweg-naam te herkennen — we tonen geen losse snelweg op de kaart maar
// wel de plaatsen die er aan grenzen via de andere waypoints.
const HIGHWAY_RE = /^A\d{1,3}(\/A\d{1,3})?$/i;

export function isHighwayName(s: string): boolean {
  return HIGHWAY_RE.test(s.trim());
}

export function geocodeWaypoint(name: string): GeoPoint | null {
  if (!name) return null;
  const q = name.trim().toLowerCase();
  // exact eerst
  const exact = ALL.find((c) => c.city.toLowerCase() === q);
  if (exact) return exact;
  // bevat een bekende plaats
  const partial = ALL.find((c) => q.includes(c.city.toLowerCase()));
  if (partial) return partial;
  return geocodeCity(name);
}
