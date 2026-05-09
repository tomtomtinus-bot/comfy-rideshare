// Loader voor Google Maps JavaScript SDK.
// Haalt de API key op via een edge function (alleen voor ingelogde gebruikers).
import { supabase } from "@/integrations/supabase/client";

let loaderPromise: Promise<typeof google> | null = null;
let cachedKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  const { data, error } = await supabase.functions.invoke("google-maps-config");
  if (error) throw error;
  if (!data?.apiKey) throw new Error("Geen Google Maps API key beschikbaar");
  cachedKey = data.apiKey;
  return cachedKey;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window !== "undefined" && (window as any).google?.maps) {
    return (window as any).google;
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = (async () => {
    const key = await getApiKey();
    return new Promise<typeof google>((resolve, reject) => {
      const cb = `__gmapsCb_${Math.random().toString(36).slice(2)}`;
      (window as any)[cb] = () => {
        delete (window as any)[cb];
        resolve((window as any).google);
      };
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=geometry&callback=${cb}&language=nl&region=NL`;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error("Kon Google Maps niet laden"));
      document.head.appendChild(s);
    });
  })();
  return loaderPromise;
}

export function googleMapsDirectionsUrl(
  origin: string | { lat: number; lng: number },
  destination: string | { lat: number; lng: number },
  waypoints?: Array<string | { lat: number; lng: number }>,
): string {
  const fmt = (p: string | { lat: number; lng: number }) =>
    typeof p === "string" ? p : `${p.lat},${p.lng}`;
  const u = new URL("https://www.google.com/maps/dir/");
  u.searchParams.set("api", "1");
  u.searchParams.set("origin", fmt(origin));
  u.searchParams.set("destination", fmt(destination));
  u.searchParams.set("travelmode", "driving");
  if (waypoints?.length) u.searchParams.set("waypoints", waypoints.map(fmt).join("|"));
  return u.toString();
}
