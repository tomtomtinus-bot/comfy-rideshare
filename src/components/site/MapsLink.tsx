import { ExternalLink } from "lucide-react";

interface MapsLinkProps {
  address: string;
  lat?: number | null;
  lng?: number | null;
  className?: string;
}

/**
 * Toont een adres als deeplink naar Google Maps (locatie, geen route).
 * Gebruikt lat/lng wanneer beschikbaar voor exacte plaatsing, anders het adres.
 */
export const MapsLink = ({ address, lat, lng, className }: MapsLinkProps) => {
  const query = lat != null && lng != null ? `${lat},${lng}` : address;
  const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        "inline-flex items-start gap-1 text-brass-deep hover:text-brass-gold underline decoration-brass-deep/20 hover:decoration-brass-gold underline-offset-2 transition-colors"
      }
      title="Open in Google Maps"
    >
      <span>{address}</span>
      <ExternalLink className="size-3 mt-1 shrink-0 opacity-60" />
    </a>
  );
};
