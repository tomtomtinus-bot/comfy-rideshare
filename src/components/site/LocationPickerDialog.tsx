/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { toast } from "sonner";
import type { AddressResult } from "@/components/site/AddressAutocomplete";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: { lat: number; lng: number } | null;
  onConfirm: (r: AddressResult) => void;
}

export function LocationPickerDialog({ open, onOpenChange, title, initial, onConfirm }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial ?? null);
  const [latStr, setLatStr] = useState(initial ? String(initial.lat) : "");
  const [lngStr, setLngStr] = useState(initial ? String(initial.lng) : "");
  const [resolved, setResolved] = useState<AddressResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const google = await loadGoogleMaps();
      if (cancelled || !mapRef.current) return;
      const start = initial ?? { lat: 52.1, lng: 5.3 };
      const map = new google.maps.Map(mapRef.current, {
        center: start,
        zoom: initial ? 14 : 7,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstance.current = map;
      geocoderRef.current = new google.maps.Geocoder();

      const setMarker = (p: google.maps.LatLngLiteral) => {
        if (!markerRef.current) {
          markerRef.current = new google.maps.Marker({ map, position: p, draggable: true });
          markerRef.current.addListener("dragend", () => {
            const ll = markerRef.current!.getPosition();
            if (ll) updatePos({ lat: ll.lat(), lng: ll.lng() });
          });
        } else {
          markerRef.current.setPosition(p);
        }
      };

      const updatePos = (p: { lat: number; lng: number }) => {
        setPos(p);
        setLatStr(p.lat.toFixed(6));
        setLngStr(p.lng.toFixed(6));
        setMarker(p);
        reverseGeocode(p);
      };

      if (initial) updatePos(initial);

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        updatePos({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const reverseGeocode = async (p: { lat: number; lng: number }) => {
    if (!geocoderRef.current) return;
    setLoading(true);
    try {
      const res = await geocoderRef.current.geocode({ location: p });
      const r = res.results?.[0];
      if (r) {
        const comps = r.address_components || [];
        const get = (t: string) => comps.find((c) => c.types.includes(t))?.long_name || "";
        const city = get("locality") || get("postal_town") || get("administrative_area_level_2") || "";
        const country = get("country") || "";
        setResolved({
          display: r.formatted_address,
          address: r.formatted_address,
          city,
          country,
          lat: p.lat,
          lng: p.lng,
        });
      } else {
        setResolved({
          display: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
          address: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
          city: "",
          country: "",
          lat: p.lat,
          lng: p.lng,
        });
      }
    } catch {
      setResolved({
        display: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
        address: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`,
        city: "",
        country: "",
        lat: p.lat,
        lng: p.lng,
      });
    } finally {
      setLoading(false);
    }
  };

  const applyCoords = () => {
    const lat = parseFloat(latStr.replace(",", "."));
    const lng = parseFloat(lngStr.replace(",", "."));
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Ongeldige coördinaten");
      return;
    }
    if (mapInstance.current) {
      mapInstance.current.setCenter({ lat, lng });
      mapInstance.current.setZoom(15);
    }
    if (!markerRef.current && mapInstance.current) {
      markerRef.current = new google.maps.Marker({ map: mapInstance.current, position: { lat, lng }, draggable: true });
      markerRef.current.addListener("dragend", () => {
        const ll = markerRef.current!.getPosition();
        if (ll) {
          const np = { lat: ll.lat(), lng: ll.lng() };
          setPos(np); setLatStr(np.lat.toFixed(6)); setLngStr(np.lng.toFixed(6));
          reverseGeocode(np);
        }
      });
    } else if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    }
    setPos({ lat, lng });
    reverseGeocode({ lat, lng });
  };

  const confirm = () => {
    if (!resolved) { toast.error("Kies eerst een locatie op de kaart"); return; }
    onConfirm(resolved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div ref={mapRef} className="w-full h-[360px] border border-brass-deep/15 bg-parchment/30" />
          <p className="text-[11px] text-brass-deep/80">Tik op de kaart of versleep de marker om een locatie te kiezen.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Latitude</label>
              <input
                value={latStr}
                onChange={(e) => setLatStr(e.target.value)}
                placeholder="52.1234"
                className="w-full bg-parchment border border-brass-deep/20 px-2 py-1.5 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Longitude</label>
              <input
                value={lngStr}
                onChange={(e) => setLngStr(e.target.value)}
                placeholder="5.1234"
                className="w-full bg-parchment border border-brass-deep/20 px-2 py-1.5 text-sm focus:outline-none focus:border-brass-gold"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyCoords}
            className="text-xs uppercase tracking-widest font-semibold text-brass-deep hover:text-brass-gold"
          >
            Coördinaten gebruiken →
          </button>
          {resolved && (
            <div className="bg-parchment/50 border border-brass-deep/15 px-3 py-2">
              <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-0.5">Gekozen locatie</p>
              <p className="text-sm">{resolved.display}</p>
              {(resolved.city || resolved.country) && (
                <p className="text-[11px] text-brass-deep/80">{[resolved.city, resolved.country].filter(Boolean).join(", ")}</p>
              )}
            </div>
          )}
          {loading && <p className="text-[11px] text-brass-deep/80">Adres opzoeken…</p>}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 border border-brass-deep/20 uppercase tracking-widest text-xs font-semibold hover:bg-brass-deep/5"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!resolved}
            className="px-5 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold disabled:opacity-50"
          >
            Bevestigen
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
