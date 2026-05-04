// Helpers om het juiste uurtarief (NL/BE) te bepalen voor een rit.

const BE_CITY_HINTS = [
  "antwerpen", "brussel", "gent", "luik", "liege", "liège", "brugge", "namen", "namur",
  "leuven", "mechelen", "hasselt", "kortrijk", "oostende", "charleroi", "mons", "bergen",
  "turnhout", "genk", "aalst", "sint-niklaas", "roeselare", "tongeren", "waregem", "ieper",
  "zaventem", "anderlecht", "schaarbeek", "eupen", "verviers", "tournai", "doornik",
  "leopoldsburg", "geel", "lier", "diest", "lokeren", "bilzen",
];

const BE_POSTCODE_RE = /\b\d{4}\b/; // BE is 4 cijfers, maar NL ook (4+letters). Gebruik samen met city-check.

export type RideLocale = "BE" | "NL";

export const isBelgianAddress = (
  city?: string | null,
  address?: string | null,
): boolean => {
  const hay = `${city ?? ""} ${address ?? ""}`.toLowerCase();
  if (!hay.trim()) return false;
  if (/\b(belgi[eë]|belgium|be)\b/.test(hay)) return true;
  if (BE_CITY_HINTS.some((c) => hay.includes(c))) return true;
  return false;
};

export const rideLocale = (
  pickup: { city?: string | null; address?: string | null },
  dropoff: { city?: string | null; address?: string | null },
): RideLocale => {
  if (isBelgianAddress(pickup.city, pickup.address)) return "BE";
  if (isBelgianAddress(dropoff.city, dropoff.address)) return "BE";
  return "NL";
};

export const rateForRide = (
  rates: { nl: number; be: number },
  pickup: { city?: string | null; address?: string | null },
  dropoff: { city?: string | null; address?: string | null },
): number => (rideLocale(pickup, dropoff) === "BE" ? rates.be : rates.nl);
