/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps, googleMapsDirectionsUrl } from "@/lib/googleMaps";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  address: string;
  label?: string;
  className?: string;
}

export function MiniMap({ address, label, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const google = await loadGoogleMaps();
        if (cancelled || !ref.current) return;

        const map = new google.maps.Map(ref.current, {
          center: { lat: 52.1, lng: 5.3 },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        const { data, error: fnErr } = await supabase.functions.invoke("google-geocode", {
          body: { queries: [address] },
        });
        if (fnErr) throw fnErr;
        if (cancelled) return;

        const r = data?.results?.[0];
        if (r && r.lat != null && r.lng != null) {
          const pos = { lat: r.lat, lng: r.lng };
          map.setCenter(pos);
          map.setZoom(15);
          new google.maps.Marker({ map, position: pos, label: label?.[0] });
        } else {
          setError("Locatie niet gevonden");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Kaart kon niet geladen worden");
      }
    })();
    return () => { cancelled = true; };
  }, [address, label]);

  return (
    <div className={className}>
      {label && (
        <p className="text-[10px] uppercase tracking-widest text-brass-deep/50 font-bold mb-1">{label}</p>
      )}
      <div ref={ref} className="h-[220px] w-full overflow-hidden rounded-lg border border-brass-deep/20" />
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="text-brass-deep/70 truncate">
          {error ? <span className="text-destructive">{error}</span> : <span className="truncate">{address}</span>}
        </div>
        <a
          href={googleMapsDirectionsUrl(address, address)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-widest text-brass-gold font-bold hover:underline shrink-0 ml-2"
        >
          ↗ Maps
        </a>
      </div>
    </div>
  );
}
