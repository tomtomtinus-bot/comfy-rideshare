import { useEffect, useRef, useState } from "react";

export interface AddressResult {
  display: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface NominatimItem {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
  address: {
    road?: string;
    house_number?: string;
    pedestrian?: string;
    border_control?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

// Overpass: alle grensovergangen (barrier=border_control of crossing) in NL/BE/DE/LU/FR
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OVERPASS_QUERY = `
[out:json][timeout:25];
(
  area["ISO3166-1"="NL"][admin_level=2];
  area["ISO3166-1"="BE"][admin_level=2];
  area["ISO3166-1"="DE"][admin_level=2];
  area["ISO3166-1"="LU"][admin_level=2];
  area["ISO3166-1"="FR"][admin_level=2];
)->.searchArea;
(
  node["barrier"="border_control"](area.searchArea);
  way["barrier"="border_control"](area.searchArea);
  node["highway"="border_control"](area.searchArea);
);
out center tags 500;
`;

let bordersCache: AddressResult[] | null = null;
let bordersLoading: Promise<AddressResult[]> | null = null;

async function loadAllBorders(): Promise<AddressResult[]> {
  if (bordersCache) return bordersCache;
  if (bordersLoading) return bordersLoading;
  bordersLoading = (async () => {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(OVERPASS_QUERY),
      });
      const data = await res.json();
      const items: AddressResult[] = (data.elements as OverpassElement[])
        .map((el) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (lat == null || lon == null) return null;
          const tags = el.tags ?? {};
          const name =
            tags.name ||
            tags["name:nl"] ||
            tags["name:de"] ||
            tags["name:fr"] ||
            tags.ref ||
            "Grensovergang";
          const route = tags.ref || tags.highway_ref || "";
          const op = tags.operator || "";
          const display = [
            "🌍 " + name,
            route && `(${route})`,
            op && `· ${op}`,
          ].filter(Boolean).join(" ");
          return {
            display,
            address: name,
            city: name,
            country: "Grensovergang",
            lat,
            lng: lon,
          } as AddressResult;
        })
        .filter((x): x is AddressResult => x !== null);
      // Dedupe by display+coords
      const seen = new Set<string>();
      const unique = items.filter((it) => {
        const k = `${it.display}|${it.lat.toFixed(3)}|${it.lng.toFixed(3)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      unique.sort((a, b) => a.display.localeCompare(b.display));
      bordersCache = unique;
      return unique;
    } catch {
      bordersCache = [];
      return [];
    } finally {
      bordersLoading = null;
    }
  })();
  return bordersLoading;
}

export const AddressAutocomplete = ({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: AddressResult) => void;
  placeholder?: string;
}) => {
  const [results, setResults] = useState<NominatimItem[]>([]);
  const [borderHits, setBorderHits] = useState<AddressResult[]>([]);
  const [allBorders, setAllBorders] = useState<AddressResult[]>([]);
  const [borderFilter, setBorderFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bordersBusy, setBordersBusy] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowBorders(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const ensureBordersLoaded = async () => {
    if (allBorders.length) return allBorders;
    setBordersBusy(true);
    const data = await loadAllBorders();
    setAllBorders(data);
    setBordersBusy(false);
    return data;
  };

  const handleChange = (v: string) => {
    onChange(v);
    if (timer.current) window.clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setBorderHits([]);
      return;
    }
    const q = v.toLowerCase();
    // Trigger laden + filter
    ensureBordersLoaded().then((all) => {
      setBorderHits(
        all
          .filter((b) => b.display.toLowerCase().includes(q) || b.city.toLowerCase().includes(q))
          .slice(0, 8),
      );
    });

    if (v.trim().length < 3) return;

    timer.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=nl,be,de,fr,lu&q=${encodeURIComponent(v)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "nl" } });
        const data: NominatimItem[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 350);
  };

  const pickNominatim = (item: NominatimItem) => {
    const a = item.address;
    const street = [a.road ?? a.pedestrian, a.house_number].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? a.county ?? "";
    const result: AddressResult = {
      display: item.display_name,
      address: street || item.display_name.split(",")[0],
      city,
      country: a.country ?? "",
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    };
    onChange(result.display);
    onSelect(result);
    setOpen(false);
    setShowBorders(false);
  };

  const pickBorder = (b: AddressResult) => {
    onChange(b.display);
    onSelect(b);
    setOpen(false);
    setShowBorders(false);
  };

  const filteredBorders = borderFilter.trim().length
    ? allBorders.filter((b) =>
        b.display.toLowerCase().includes(borderFilter.toLowerCase()) ||
        b.city.toLowerCase().includes(borderFilter.toLowerCase()),
      )
    : allBorders;

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-end justify-between gap-2">
        <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{label}</label>
        <button
          type="button"
          onClick={async () => {
            setOpen(false);
            setShowBorders((s) => !s);
            await ensureBordersLoaded();
          }}
          className="text-[10px] uppercase tracking-widest text-brass-gold font-bold hover:underline"
        >
          🌍 Alle grensovergangen
        </button>
      </div>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? "Adres, stad of grensovergang…"}
        className="mt-1 w-full bg-card border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
        autoComplete="off"
      />
      <p className="text-[10px] text-brass-deep/50 mt-1 min-h-[14px]">
        {busy ? "Adres zoeken…" : bordersBusy ? "Grensovergangen laden…" : "Selecteer een adres of grensovergang uit de lijst"}
      </p>

      {showBorders && (
        <div className="absolute z-30 left-0 right-0 bg-card border border-brass-gold/40 shadow-lg max-h-80 overflow-hidden flex flex-col">
          <div className="px-3 py-2 bg-parchment border-b border-brass-deep/10 sticky top-0">
            <input
              autoFocus
              value={borderFilter}
              onChange={(e) => setBorderFilter(e.target.value)}
              placeholder={`Filter ${allBorders.length || ""} grensovergangen…`}
              className="w-full bg-card border border-brass-deep/15 px-3 py-1.5 text-sm focus:outline-none focus:border-brass-gold"
            />
          </div>
          <ul className="overflow-auto">
            {bordersBusy && !allBorders.length && (
              <li className="px-4 py-3 text-sm text-brass-deep/60">Grensovergangen laden uit OpenStreetMap…</li>
            )}
            {!bordersBusy && filteredBorders.length === 0 && allBorders.length > 0 && (
              <li className="px-4 py-3 text-sm text-brass-deep/60">Geen resultaten voor "{borderFilter}"</li>
            )}
            {filteredBorders.slice(0, 200).map((b, i) => (
              <li
                key={i}
                onClick={() => pickBorder(b)}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
              >
                {b.display}
              </li>
            ))}
            {filteredBorders.length > 200 && (
              <li className="px-4 py-2 text-[10px] text-brass-deep/50 italic">+{filteredBorders.length - 200} meer — verfijn de zoekterm</li>
            )}
          </ul>
        </div>
      )}

      {open && (results.length > 0 || borderHits.length > 0) && (
        <ul className="absolute z-20 left-0 right-0 bg-card border border-brass-deep/20 shadow-lg max-h-72 overflow-auto">
          {borderHits.length > 0 && (
            <>
              <li className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-brass-gold font-bold bg-parchment">
                Grensovergangen
              </li>
              {borderHits.map((b, i) => (
                <li
                  key={`b${i}`}
                  onClick={() => pickBorder(b)}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10"
                >
                  {b.display}
                </li>
              ))}
            </>
          )}
          {results.length > 0 && (
            <>
              <li className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold bg-parchment/60">
                Adressen
              </li>
              {results.map((r, i) => (
                <li
                  key={`n${i}`}
                  onClick={() => pickNominatim(r)}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
                >
                  {r.display_name}
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
};
