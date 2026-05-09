import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, googleMapsDirectionsUrl } from "@/lib/googleMaps";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  origin: string;
  destination: string;
  className?: string;
}

export function RideMap({ origin, destination, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !ref.current) return;

        const map = new google.maps.Map(ref.current, {
          center: { lat: 52.1, lng: 5.3 },
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const { data, error: fnErr } = await supabase.functions.invoke("google-directions", {
          body: { origin, destination },
        });
        if (fnErr) throw fnErr;
        if (cancelled) return;

        if (data?.polyline) {
          const path = google.maps.geometry.encoding.decodePath(data.polyline);
          new google.maps.Polyline({
            path,
            map,
            strokeColor: "#b8860b",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          if (data.bounds) {
            const b = new google.maps.LatLngBounds(
              { lat: data.bounds.southwest.lat, lng: data.bounds.southwest.lng },
              { lat: data.bounds.northeast.lat, lng: data.bounds.northeast.lng },
            );
            map.fitBounds(b, 40);
          }
          if (data.start) new google.maps.Marker({ map, position: data.start, label: "A" });
          if (data.end) new google.maps.Marker({ map, position: data.end, label: "B" });
          setInfo({ distance: data.distance_text, duration: data.duration_text });
        } else {
          setError("Geen route gevonden");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Kaart kon niet geladen worden");
      }
    })();
    return () => { cancelled = true; };
  }, [origin, destination]);

  return (
    <div className={className}>
      <div ref={ref} className="h-[360px] w-full overflow-hidden rounded-lg border border-brass-deep/20" />
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="text-brass-deep/70">
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : info ? (
            <span>{info.distance} · ca. {info.duration}</span>
          ) : (
            <span>Route laden…</span>
          )}
        </div>
        <a
          href={googleMapsDirectionsUrl(origin, destination)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-widest text-brass-gold font-bold hover:underline"
        >
          ↗ Open in Google Maps
        </a>
      </div>
    </div>
  );
}
