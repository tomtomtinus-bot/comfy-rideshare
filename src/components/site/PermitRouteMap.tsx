import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeWaypoint, isHighwayName } from "@/lib/permitGeo";
import type { PermitWaypoint } from "@/lib/permitParser";

// Fix default marker icons in Leaflet bundling
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface Props {
  origin: string;
  destination: string;
  waypoints: PermitWaypoint[];
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 9);
    } else {
      map.fitBounds(points, { padding: [30, 30] });
    }
  }, [points, map]);
  return null;
}

export function PermitRouteMap({ origin, destination, waypoints }: Props) {
  // Verzamel geocodeerbare punten uit waypoints (skip pure snelweg-aanduidingen)
  const points: { name: string; lat: number; lng: number; passage?: string }[] = [];

  const tryAdd = (name: string, passage?: string) => {
    if (!name || isHighwayName(name)) return;
    const g = geocodeWaypoint(name);
    if (g) {
      // Voorkom directe duplicaten (zelfde locatie kort na elkaar)
      const last = points[points.length - 1];
      if (!last || last.lat !== g.lat || last.lng !== g.lng) {
        points.push({ name, lat: g.lat, lng: g.lng, passage });
      }
    }
  };

  tryAdd(origin);
  for (const wp of waypoints) {
    tryAdd(wp.trajectbeschrijving, wp.passagevoorwaarden);
  }
  tryAdd(destination);

  const coords: [number, number][] = points.map((p) => [p.lat, p.lng]);
  const center: [number, number] = coords[0] ?? [52.1, 5.3];

  return (
    <div className="h-[400px] w-full overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={7} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {coords.length > 1 && (
          <Polyline positions={coords} pathOptions={{ color: "hsl(220 80% 50%)", weight: 3, opacity: 0.7 }} />
        )}
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">
                  {i === 0 ? "🟢 Start: " : i === points.length - 1 ? "🔴 Eind: " : `📍 ${i}. `}
                  {p.name}
                </div>
                {p.passage && <div className="text-xs">{p.passage}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds points={coords} />
      </MapContainer>
    </div>
  );
}
