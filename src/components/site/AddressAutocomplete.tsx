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

// Volledige lijst van grensovergangen Nederland ↔ België
// Bron: Rijkswaterstaat / NGI BE — alle wegverbindingen die de NL/BE-grens kruisen
const NL_BE_BORDERS: AddressResult[] = [
  // Zeeuws-Vlaanderen (West)
  { display: "🌍 Cadzand — Knokke-Heist (N675)", address: "Cadzand", city: "Sluis", country: "NL/BE", lat: 51.3722, lng: 3.4006 },
  { display: "🌍 Sluis — Westkapelle (N376/N49)", address: "Sluis", city: "Sluis", country: "NL/BE", lat: 51.3092, lng: 3.3858 },
  { display: "🌍 Eede — Maldegem (N251/N410)", address: "Eede", city: "Sluis", country: "NL/BE", lat: 51.2697, lng: 3.4458 },
  { display: "🌍 Sint Anna ter Muiden — Westkapelle", address: "Sint Anna ter Muiden", city: "Sluis", country: "NL/BE", lat: 51.3142, lng: 3.3669 },
  { display: "🌍 Heille — Middelburg (B)", address: "Heille", city: "Sluis", country: "NL/BE", lat: 51.2767, lng: 3.4192 },
  { display: "🌍 Sint Kruis — Maldegem", address: "Sint Kruis", city: "Sluis", country: "NL/BE", lat: 51.2872, lng: 3.4889 },
  { display: "🌍 Aardenburg — Maldegem (N410)", address: "Aardenburg", city: "Sluis", country: "NL/BE", lat: 51.2719, lng: 3.4467 },
  // Zeeuws-Vlaanderen (Midden/Oost)
  { display: "🌍 Sas van Gent — Zelzate (N252/N49)", address: "Sas van Gent", city: "Terneuzen", country: "NL/BE", lat: 51.2244, lng: 3.8047 },
  { display: "🌍 Westdorpe — Zelzate (N683)", address: "Westdorpe", city: "Terneuzen", country: "NL/BE", lat: 51.2272, lng: 3.8264 },
  { display: "🌍 Overslag — Wachtebeke", address: "Overslag", city: "Terneuzen", country: "NL/BE", lat: 51.2417, lng: 3.8703 },
  { display: "🌍 Koewacht — Moerbeke", address: "Koewacht", city: "Terneuzen", country: "NL/BE", lat: 51.2533, lng: 3.9183 },
  { display: "🌍 De Klinge — Sint-Gillis-Waas", address: "De Klinge", city: "Hulst", country: "NL/BE", lat: 51.2378, lng: 4.1108 },
  { display: "🌍 Clinge — Sint-Gillis-Waas (N403)", address: "Clinge", city: "Hulst", country: "NL/BE", lat: 51.2697, lng: 4.1583 },
  { display: "🌍 Nieuw-Namen — Kieldrecht (N451)", address: "Nieuw-Namen", city: "Hulst", country: "NL/BE", lat: 51.3047, lng: 4.2250 },
  { display: "🌍 Kapellebrug — Sint-Niklaas (N60)", address: "Kapellebrug", city: "Hulst", country: "NL/BE", lat: 51.2650, lng: 4.0583 },
  // West-Brabant
  { display: "🌍 Putte — Kapellen (A4/E19)", address: "Putte", city: "Woensdrecht", country: "NL/BE", lat: 51.3736, lng: 4.3792 },
  { display: "🌍 Putte-Stabroek (N111)", address: "Putte", city: "Woensdrecht", country: "NL/BE", lat: 51.3739, lng: 4.3722 },
  { display: "🌍 Ossendrecht — Kalmthout", address: "Ossendrecht", city: "Woensdrecht", country: "NL/BE", lat: 51.3814, lng: 4.3239 },
  { display: "🌍 Huijbergen — Essen (N289)", address: "Huijbergen", city: "Woensdrecht", country: "NL/BE", lat: 51.4264, lng: 4.3803 },
  { display: "🌍 Wernhout — Wuustwezel (N263/N1)", address: "Wernhout", city: "Zundert", country: "NL/BE", lat: 51.4003, lng: 4.6281 },
  { display: "🌍 Zundert — Meer (A16/E19, Hazeldonk)", address: "Hazeldonk", city: "Breda", country: "NL/BE", lat: 51.4347, lng: 4.7619 },
  { display: "🌍 Meersel-Dreef — Galder", address: "Galder", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4486, lng: 4.7708 },
  { display: "🌍 Strijbeek — Meerle (N639)", address: "Strijbeek", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4467, lng: 4.7286 },
  { display: "🌍 Castelré — Minderhout", address: "Castelré", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4283, lng: 4.8067 },
  // Baarle-Nassau / Hertog (enclaves)
  { display: "🌍 Baarle-Nassau / Baarle-Hertog (N260)", address: "Baarle-Nassau", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4444, lng: 4.9281 },
  { display: "🌍 Ulicoten — Baarle-Hertog (N132)", address: "Ulicoten", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4231, lng: 4.8722 },
  { display: "🌍 Chaam — Hoogstraten", address: "Chaam", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4886, lng: 4.8633 },
  // Midden-Brabant
  { display: "🌍 Goirle — Poppel (N269)", address: "Goirle", city: "Goirle", country: "NL/BE", lat: 51.5083, lng: 5.0653 },
  { display: "🌍 Hilvarenbeek — Weelde (N269)", address: "Hilvarenbeek", city: "Hilvarenbeek", country: "NL/BE", lat: 51.4861, lng: 5.1394 },
  { display: "🌍 Reusel — Arendonk (N284/N18)", address: "Reusel", city: "Reusel-De Mierden", country: "NL/BE", lat: 51.3550, lng: 5.1564 },
  { display: "🌍 Bladel — Lommel (N284)", address: "Bladel", city: "Bladel", country: "NL/BE", lat: 51.3683, lng: 5.2150 },
  { display: "🌍 Eersel — Lommel (A67/E34, Postel)", address: "Eersel", city: "Eersel", country: "NL/BE", lat: 51.3447, lng: 5.2364 },
  { display: "🌍 Bergeijk — Lommel (N69)", address: "Bergeijk", city: "Bergeijk", country: "NL/BE", lat: 51.3214, lng: 5.3531 },
  { display: "🌍 Borkel en Schaft — Achel (N69)", address: "Borkel en Schaft", city: "Valkenswaard", country: "NL/BE", lat: 51.3186, lng: 5.4103 },
  { display: "🌍 Valkenswaard — Hamont (N72)", address: "Valkenswaard", city: "Valkenswaard", country: "NL/BE", lat: 51.3344, lng: 5.4500 },
  { display: "🌍 Budel — Hamont-Achel (N274)", address: "Budel", city: "Cranendonck", country: "NL/BE", lat: 51.2908, lng: 5.5589 },
  { display: "🌍 Soerendonk — Bocholt", address: "Soerendonk", city: "Cranendonck", country: "NL/BE", lat: 51.2792, lng: 5.6053 },
  { display: "🌍 Weert — Bocholt (N57/N73)", address: "Weert", city: "Weert", country: "NL/BE", lat: 51.2347, lng: 5.6814 },
  { display: "🌍 Stramproy — Bree (N292)", address: "Stramproy", city: "Weert", country: "NL/BE", lat: 51.1975, lng: 5.7058 },
  // Limburg (Maaskruisingen + Voerstreek)
  { display: "🌍 Kessenich — Ohé en Laak", address: "Kessenich", city: "Maasgouw", country: "NL/BE", lat: 51.1500, lng: 5.7733 },
  { display: "🌍 Maaseik — Roosteren (N78)", address: "Roosteren", city: "Echt-Susteren", country: "NL/BE", lat: 51.1642, lng: 5.7861 },
  { display: "🌍 Dilsen — Berg aan de Maas", address: "Berg aan de Maas", city: "Stein", country: "NL/BE", lat: 51.0125, lng: 5.7639 },
  { display: "🌍 Stein — Stokkem (Maasveer)", address: "Stein", city: "Stein", country: "NL/BE", lat: 50.9794, lng: 5.7517 },
  { display: "🌍 Born — Maasmechelen (A2/E25)", address: "Born", city: "Sittard-Geleen", country: "NL/BE", lat: 51.0083, lng: 5.7717 },
  { display: "🌍 Urmond — Maasmechelen", address: "Urmond", city: "Stein", country: "NL/BE", lat: 50.9758, lng: 5.7600 },
  { display: "🌍 Maastricht-West — Lanaken (N78/Tongerseweg)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8479, lng: 5.6517 },
  { display: "🌍 Smeermaas — Lanaken (N78)", address: "Smeermaas", city: "Maastricht", country: "NL/BE", lat: 50.8736, lng: 5.6764 },
  { display: "🌍 Maastricht — Vroenhoven (N79/N619)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8497, lng: 5.6678 },
  { display: "🌍 Maastricht — Veldwezelt (N2)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8639, lng: 5.6597 },
  { display: "🌍 Eijsden — Visé (N278/N618)", address: "Eijsden", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7658, lng: 5.7036 },
  { display: "🌍 Mesch — Mouland", address: "Mesch", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7714, lng: 5.7333 },
  { display: "🌍 Noorbeek — 's-Gravenvoeren (N597)", address: "Noorbeek", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7747, lng: 5.7800 },
  { display: "🌍 Slenaken — Sint-Martens-Voeren", address: "Slenaken", city: "Gulpen-Wittem", country: "NL/BE", lat: 50.7781, lng: 5.8761 },
  { display: "🌍 Epen — Teuven (N598)", address: "Epen", city: "Gulpen-Wittem", country: "NL/BE", lat: 50.7689, lng: 5.9303 },
];
NL_BE_BORDERS.sort((a, b) => a.display.localeCompare(b.display));

let bordersCache: AddressResult[] | null = NL_BE_BORDERS;

async function loadAllBorders(): Promise<AddressResult[]> {
  return bordersCache ?? NL_BE_BORDERS;
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
