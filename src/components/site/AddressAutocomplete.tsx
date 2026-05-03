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

// Veelgebruikte grensovergangen tussen NL/BE/DE/LU
const BORDER_CROSSINGS: AddressResult[] = [
  { display: "Grensovergang Hazeldonk (NL/BE) — A16/E19", address: "Hazeldonk", city: "Breda", country: "Nederland/België", lat: 51.4347, lng: 4.7619 },
  { display: "Grensovergang Wuustwezel — Zundert (NL/BE)", address: "N263", city: "Zundert", country: "Nederland/België", lat: 51.4644, lng: 4.6519 },
  { display: "Grensovergang Putte (NL/BE) — A4/E19", address: "Putte", city: "Putte", country: "Nederland/België", lat: 51.3736, lng: 4.3792 },
  { display: "Grensovergang Sas van Gent — Zelzate (NL/BE)", address: "N252", city: "Sas van Gent", country: "Nederland/België", lat: 51.2244, lng: 3.8047 },
  { display: "Grensovergang Maastricht — Lanaken (NL/BE)", address: "Tongerseweg", city: "Maastricht", country: "Nederland/België", lat: 50.8479, lng: 5.6517 },
  { display: "Grensovergang Eijsden — Visé (NL/BE) — A2/E25", address: "Eijsden", city: "Eijsden", country: "Nederland/België", lat: 50.7658, lng: 5.7036 },
  { display: "Grensovergang Bergh / Emmerich (NL/DE) — A12/A3", address: "'s-Heerenberg", city: "'s-Heerenberg", country: "Nederland/Duitsland", lat: 51.8769, lng: 6.2389 },
  { display: "Grensovergang Oldenzaal / Bad Bentheim (NL/DE) — A1/A30", address: "De Lutte", city: "Oldenzaal", country: "Nederland/Duitsland", lat: 52.3667, lng: 7.0167 },
  { display: "Grensovergang Venlo / Kaldenkirchen (NL/DE) — A67/A40", address: "Venlo", city: "Venlo", country: "Nederland/Duitsland", lat: 51.3461, lng: 6.2289 },
  { display: "Grensovergang Heerlen / Aachen (NL/DE) — A76/A4", address: "Bocholtz", city: "Heerlen", country: "Nederland/Duitsland", lat: 50.8161, lng: 6.0331 },
  { display: "Grensovergang Nieuweschans / Bunde (NL/DE) — A7", address: "Nieuweschans", city: "Bad Nieuweschans", country: "Nederland/Duitsland", lat: 53.1842, lng: 7.2147 },
  { display: "Grensovergang Coevorden / Laar (NL/DE)", address: "Coevorden", city: "Coevorden", country: "Nederland/Duitsland", lat: 52.6556, lng: 6.7728 },
  { display: "Grensovergang Eynatten / Lichtenbusch (BE/DE) — A3/E40", address: "Eynatten", city: "Raeren", country: "België/Duitsland", lat: 50.6958, lng: 6.1264 },
  { display: "Grensovergang Sterpenich / Wasserbillig (BE/LU) — E25/E411", address: "Sterpenich", city: "Aarlen", country: "België/Luxemburg", lat: 49.6686, lng: 5.9139 },
];

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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const handleChange = (v: string) => {
    onChange(v);
    if (timer.current) window.clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setResults([]);
      setBorderHits([]);
      return;
    }
    // Lokale grensovergang-filter (instant)
    const q = v.toLowerCase();
    setBorderHits(
      BORDER_CROSSINGS.filter(
        (b) =>
          b.display.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          (q.includes("grens") || q.includes("border") || q.includes("übergang")),
      ).slice(0, 6),
    );

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

  return (
    <div className="relative" ref={wrapRef}>
      <div className="flex items-end justify-between gap-2">
        <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{label}</label>
        <button
          type="button"
          onClick={() => {
            setShowBorders((s) => !s);
            setOpen(false);
          }}
          className="text-[10px] uppercase tracking-widest text-brass-gold font-bold hover:underline"
        >
          🌍 Grensovergang
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
        {busy ? "Adres zoeken…" : "Selecteer een adres of grensovergang uit de lijst"}
      </p>

      {showBorders && (
        <ul className="absolute z-30 left-0 right-0 bg-card border border-brass-gold/40 shadow-lg max-h-72 overflow-auto">
          <li className="px-4 py-2 text-[10px] uppercase tracking-widest text-brass-gold font-bold bg-parchment border-b border-brass-deep/10">
            Grensovergangen
          </li>
          {BORDER_CROSSINGS.map((b, i) => (
            <li
              key={i}
              onClick={() => pickBorder(b)}
              className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
            >
              {b.display}
            </li>
          ))}
        </ul>
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
                  🌍 {b.display}
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
