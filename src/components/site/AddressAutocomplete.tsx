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
  address: {
    road?: string;
    house_number?: string;
    pedestrian?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    country?: string;
  };
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
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timer.current) window.clearTimeout(timer.current);
    if (v.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=nl,be,de,fr,lu&q=${encodeURIComponent(v)}`;
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

  const pick = (item: NominatimItem) => {
    const a = item.address;
    const street = [a.road ?? a.pedestrian, a.house_number].filter(Boolean).join(" ");
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? "";
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
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">{label}</label>
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder ?? "Begin met typen…"}
        className="mt-1 w-full bg-card border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
        autoComplete="off"
      />
      <p className="text-[10px] text-brass-deep/50 mt-1 min-h-[14px]">
        {busy ? "Adres zoeken…" : "Selecteer een adres uit de lijst"}
      </p>
      {open && results.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 bg-card border border-brass-deep/20 shadow-lg max-h-64 overflow-auto">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => pick(r)}
              className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
