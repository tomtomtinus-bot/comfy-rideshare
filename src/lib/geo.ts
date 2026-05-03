// Eenvoudige geocoder voor Nederlandse en Belgische steden.
// Op productie kan dit vervangen worden door een echte routing API.

export interface GeoPoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const CITIES: GeoPoint[] = [
  { city: "Amsterdam", country: "Nederland", lat: 52.3676, lng: 4.9041 },
  { city: "Rotterdam", country: "Nederland", lat: 51.9244, lng: 4.4777 },
  { city: "Den Haag", country: "Nederland", lat: 52.0705, lng: 4.3007 },
  { city: "Utrecht", country: "Nederland", lat: 52.0907, lng: 5.1214 },
  { city: "Eindhoven", country: "Nederland", lat: 51.4416, lng: 5.4697 },
  { city: "Groningen", country: "Nederland", lat: 53.2194, lng: 6.5665 },
  { city: "Tilburg", country: "Nederland", lat: 51.5555, lng: 5.0913 },
  { city: "Almere", country: "Nederland", lat: 52.3508, lng: 5.2647 },
  { city: "Breda", country: "Nederland", lat: 51.5719, lng: 4.7683 },
  { city: "Nijmegen", country: "Nederland", lat: 51.8126, lng: 5.8372 },
  { city: "Haarlem", country: "Nederland", lat: 52.3874, lng: 4.6462 },
  { city: "Arnhem", country: "Nederland", lat: 51.9851, lng: 5.8987 },
  { city: "Zwolle", country: "Nederland", lat: 52.5168, lng: 6.0830 },
  { city: "Maastricht", country: "Nederland", lat: 50.8514, lng: 5.6910 },
  { city: "Leiden", country: "Nederland", lat: 52.1601, lng: 4.4970 },
  { city: "Den Bosch", country: "Nederland", lat: 51.6978, lng: 5.3037 },
  { city: "Apeldoorn", country: "Nederland", lat: 52.2112, lng: 5.9699 },
  { city: "Antwerpen", country: "België", lat: 51.2194, lng: 4.4025 },
  { city: "Brussel", country: "België", lat: 50.8503, lng: 4.3517 },
  { city: "Gent", country: "België", lat: 51.0543, lng: 3.7174 },
];

export function geocode(query: string): GeoPoint | null {
  if (!query) return null;
  const q = query.trim().toLowerCase();
  // exact city
  const exact = CITIES.find((c) => c.city.toLowerCase() === q);
  if (exact) return exact;
  // contains
  const partial = CITIES.find((c) => q.includes(c.city.toLowerCase()));
  if (partial) return partial;
  return null;
}

// Haversine afstand in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Geschatte reistijd in minuten op basis van 70 km/u gemiddelde
export function travelMinutes(km: number): number {
  return Math.round((km / 70) * 60);
}
