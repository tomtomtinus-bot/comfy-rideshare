// Geocode helper voor ontheffing-waypoints.
// Combineert onze bestaande NL-stedenlijst met snelweg-knooppunten en bekende locatienamen.

import { CITIES, geocode as geocodeCity, type GeoPoint } from "./geo";

// Bekende NL snelweg-knooppunten en locaties die vaak in RDW-routes voorkomen.
const EXTRA: GeoPoint[] = [
  { city: "Knooppunt Beekbergen", country: "Nederland", lat: 52.123, lng: 5.998 },
  { city: "Knooppunt Hattemerbroek", country: "Nederland", lat: 52.482, lng: 5.992 },
  { city: "Knooppunt Lunetten", country: "Nederland", lat: 52.057, lng: 5.137 },
  { city: "Knooppunt Oudenrijn", country: "Nederland", lat: 52.072, lng: 5.054 },
  { city: "Knooppunt Ridderkerk", country: "Nederland", lat: 51.871, lng: 4.583 },
  { city: "Knooppunt Vaanplein", country: "Nederland", lat: 51.852, lng: 4.541 },
  { city: "Knooppunt Hoogvliet", country: "Nederland", lat: 51.866, lng: 4.391 },
  { city: "Knooppunt Benelux", country: "Nederland", lat: 51.886, lng: 4.382 },
  { city: "De Lutte", country: "Nederland", lat: 52.317, lng: 7.001 },
  { city: "Oldenzaal", country: "Nederland", lat: 52.314, lng: 6.929 },
  { city: "Hengelo", country: "Nederland", lat: 52.265, lng: 6.793 },
  { city: "Deventer", country: "Nederland", lat: 52.255, lng: 6.163 },
  { city: "Apeldoorn", country: "Nederland", lat: 52.211, lng: 5.969 },
  { city: "Tegelen", country: "Nederland", lat: 51.336, lng: 6.146 },
  { city: "Venlo", country: "Nederland", lat: 51.370, lng: 6.172 },
  { city: "Eindhoven", country: "Nederland", lat: 51.441, lng: 5.469 },
  { city: "Tilburg", country: "Nederland", lat: 51.555, lng: 5.091 },
  { city: "Breda", country: "Nederland", lat: 51.571, lng: 4.768 },
  { city: "Bergen op Zoom", country: "Nederland", lat: 51.495, lng: 4.287 },
  { city: "Goes", country: "Nederland", lat: 51.503, lng: 3.890 },
  { city: "Middelburg", country: "Nederland", lat: 51.499, lng: 3.610 },
  { city: "Vlissingen", country: "Nederland", lat: 51.443, lng: 3.573 },
  { city: "Voltaweg, Vlissingen", country: "Nederland", lat: 51.451, lng: 3.643 },
  { city: "Zutphensestraat", country: "Nederland", lat: 52.180, lng: 6.042 },
];

// Bekende grensovergangen NL ↔ DE / BE. Deze worden vóór losse plaatsen gematched
// zodat 'Tegelen / Kaldenkirchen' niet in Tegelen op de kaart belandt.
const BORDER_CROSSINGS: GeoPoint[] = [
  { city: "A74 Tegelen – A61 Nettetal", country: "Grens NL/DE", lat: 51.333115, lng: 6.169855 },
  { city: "A67 Venlo – A40 Straelen", country: "Grens NL/DE", lat: 51.384219, lng: 6.216112 },
  { city: "N280 Roermond – A52 Elmpt", country: "Grens NL/DE", lat: 51.200586, lng: 6.070845 },
  { city: "N297 Sittard – B56 Selfkant", country: "Grens NL/DE", lat: 51.031602, lng: 5.876813 },
  { city: "A76 Bocholtz – A4 Herzogenrath", country: "Grens NL/DE", lat: 50.818887, lng: 6.024716 },
  { city: "Withuis – N627 Moelingen", country: "Grens NL/BE", lat: 50.764330, lng: 5.721239 },
  { city: "A2 Eijsden – E25 Moelingen", country: "Grens NL/BE", lat: 50.754985, lng: 5.696373 },
  { city: "Smeermaas – Maastricht", country: "Grens NL/BE", lat: 50.880928, lng: 5.673229 },
  { city: "Veldwezelt – Maastricht", country: "Grens NL/BE", lat: 50.858774, lng: 5.644226 },
  { city: "Vroenhoven – N278 Maastricht", country: "Grens NL/BE", lat: 50.833134, lng: 5.648032 },
  { city: "A76 Elsloo – A2 Maasmechelen", country: "Grens NL/BE", lat: 50.958522, lng: 5.754253 },
  { city: "N296 Roosteren – N78 Maaseik", country: "Grens NL/BE", lat: 51.092986, lng: 5.798304 },
  { city: "N273 Ittervoort – N78 Kessenich", country: "Grens NL/BE", lat: 51.158889, lng: 5.813385 },
  { city: "N292 Stramproy – N762 Molenbeersel", country: "Grens NL/BE", lat: 51.184584, lng: 5.725385 },
  { city: "N69 Bergeijk – N74 Lommel", country: "Grens NL/BE", lat: 51.266760, lng: 5.396067 },
  { city: "A67 Hapert – E34 Postel", country: "Grens NL/BE", lat: 51.318834, lng: 5.209028 },
  { city: "N630 Goirle – N12 Poppel", country: "Grens NL/BE", lat: 51.470796, lng: 5.048247 },
  { city: "N260 Baarle Nassau – N119 Weelde", country: "Grens NL/BE", lat: 51.401875, lng: 4.936812 },
  { city: "A16 Hazeldonk – E19 Meer", country: "Grens NL/BE", lat: 51.485904, lng: 4.735467 },
  { city: "Zundert – Wuustwezel", country: "Grens NL/BE", lat: 51.426593, lng: 4.623757 },
  { city: "A4 Ossendrecht – A12 Zandvliet", country: "Grens NL/BE", lat: 51.376908, lng: 4.304169 },
  { city: "N290 Hulst – N403 Stekene", country: "Grens NL/BE", lat: 51.247627, lng: 4.064444 },
  { city: "N62 Westdorpe – N423 Zelzate", country: "Grens NL/BE", lat: 51.209175, lng: 3.824539 },
  { city: "N252 Sas van Gent – N474 Zelzate", country: "Grens NL/BE", lat: 51.210590, lng: 3.800742 },
  { city: "N251 Eede – N410 Maldegem", country: "Grens NL/BE", lat: 51.241402, lng: 3.448443 },
  { city: "N253 Sluis – N376 Knokke", country: "Grens NL/BE", lat: 51.314727, lng: 3.358539 },
  { city: "A77 Gennep – A57 Goch", country: "Grens NL/DE", lat: 51.674848, lng: 6.034571 },
  { city: "N291 Ottersum – B504 Grunewald", country: "Grens NL/DE", lat: 51.717030, lng: 6.045059 },
  { city: "N325 Nijmegen – B9 Kranenburg", country: "Grens NL/DE", lat: 51.816152, lng: 5.957811 },
  { city: "A12 Beek – A3 Elten", country: "Grens NL/DE", lat: 51.898694, lng: 6.165667 },
  { city: "N35 Glanenbrug – B53 Gronau", country: "Grens NL/DE", lat: 52.193449, lng: 6.962237 },
  { city: "A1 De Lutte – A30 Bad Bentheim", country: "Grens NL/DE", lat: 52.313686, lng: 7.043212 },
  { city: "N342 Denekamp – B213 Nordhorn", country: "Grens NL/DE", lat: 52.403243, lng: 7.035178 },
  { city: "N382 Coevorden – B403 Laar", country: "Grens NL/DE", lat: 52.647119, lng: 6.755702 },
  { city: "N853 Schoonebeek – Emlicheim", country: "Grens NL/DE", lat: 52.653039, lng: 6.872336 },
  { city: "A37 Zwarte Meer – B402 Meppen", country: "Grens NL/DE", lat: 52.722530, lng: 7.064155 },
  { city: "N366 Ter Apel – B408 Rutenbrock", country: "Grens NL/DE", lat: 52.848286, lng: 7.087902 },
  { city: "A7 Bad Nieuweschans – A280 Bunde", country: "Grens NL/DE", lat: 53.180464, lng: 7.227212 },
  { city: "E40 Eynatten – B44 Lichtenbusch", country: "Grens BE/DE", lat: 50.718344, lng: 6.120243 },
  { city: "N3 Kelmis – B264 Aken", country: "Grens BE/DE", lat: 50.726118, lng: 6.033226 },
  { city: "N68 Raeren – B57 Aachen", country: "Grens BE/DE", lat: 50.721931, lng: 6.090238 },
  { city: "E42 Sankt Vith – E42 Winterspelt", country: "Grens BE/DE", lat: 50.237289, lng: 6.181250 },
  { city: "N62 Wemperhardt – N12 Weiswampach", country: "Grens BE/LU", lat: 50.156343, lng: 6.052220 },
  { city: "N68 Gouvy – N7 Schmett", country: "Grens BE/LU", lat: 50.182432, lng: 6.022474 },
  { city: "N84 Bastonge – N15 Bohey", country: "Grens BE/LU", lat: 49.981442, lng: 5.837805 },
  { city: "N844 Aarlen – N8 Gaichel", country: "Grens BE/LU", lat: 49.694516, lng: 5.867514 },
  { city: "N4 Aarlen – N6 Steinfort", country: "Grens BE/LU", lat: 49.658824, lng: 5.903923 },
  { city: "E25 Sterpenich – A6 Steinfort", country: "Grens BE/LU", lat: 49.638518, lng: 5.906325 },
  { city: "N88 Aubange – Petange", country: "Grens BE/LU", lat: 49.560639, lng: 5.843792 },
  { city: "N830 Aubange – E44 Petange", country: "Grens BE/LU", lat: 49.553593, lng: 5.842091 },
  { city: "E411 Aubange – N52 Longwy", country: "Grens BE/FR", lat: 49.550388, lng: 5.807073 },
  { city: "N883 Aubange – D918 Longwy", country: "Grens BE/FR", lat: 49.555268, lng: 5.787525 },
  { city: "N89 Bouillon – N58 Bazeilles", country: "Grens BE/FR", lat: 49.762303, lng: 5.062765 },
  { city: "N5 Bruly – A304 Rocroi", country: "Grens BE/FR", lat: 49.962863, lng: 4.533248 },
  { city: "E420 Bruly – A304 Rocroi", country: "Grens BE/FR", lat: 49.964406, lng: 4.535416 },
  { city: "N6 Bergen – N2 Maubeuge", country: "Grens BE/FR", lat: 50.343152, lng: 3.970717 },
  { city: "N51 Quievrain – D630 Quievrechain", country: "Grens BE/FR", lat: 50.403582, lng: 3.674532 },
  { city: "E19 Hensies – A2 Saint-Aybert", country: "Grens BE/FR", lat: 50.438775, lng: 3.668722 },
  { city: "N60 Peruwelz – D935 CONDE-SUR-ESCAUT", country: "Grens BE/FR", lat: 50.496954, lng: 3.607198 },
  { city: "N507 Brunehaut – D169 Maulde", country: "Grens BE/FR", lat: 50.505255, lng: 3.429967 },
  { city: "N508 Rumes – D938 Mouchin", country: "Grens BE/FR", lat: 50.529351, lng: 3.286444 },
  { city: "E42 Doornik – A27 Baisieux", country: "Grens BE/FR", lat: 50.603846, lng: 3.274485 },
  { city: "N7 Doornik – M941 Baisieux", country: "Grens BE/FR", lat: 50.607894, lng: 3.270360 },
  { city: "E17 Moeskroen – E17 Tourcoing", country: "Grens BE/FR", lat: 50.764528, lng: 3.168529 },
  { city: "N38 Poperingen – D948 Steenvoorde", country: "Grens BE/FR", lat: 50.817135, lng: 2.675867 },
  { city: "E40 De Panne – A16 Gijvelde", country: "Grens BE/FR", lat: 51.057007, lng: 2.562302 },
  { city: "N39 De Panne – D601 Gijvelde", country: "Grens BE/FR", lat: 51.069796, lng: 2.559363 },
  { city: "Flensburg – Padborg", country: "Grens DE/DK", lat: 54.805667, lng: 9.328472 },
  { city: "Garz – Świnoujście", country: "Grens DE/PL", lat: 53.891000, lng: 14.213167 },
  { city: "Lubieszyn – Linken", country: "Grens DE/PL", lat: 53.453250, lng: 14.371167 },
  { city: "Kołbaskowo – Pomellen", country: "Grens DE/PL", lat: 53.335639, lng: 14.408444 },
  { city: "Rosówek – Rosow", country: "Grens DE/PL", lat: 53.306806, lng: 14.409139 },
  { city: "Mescherin – Gryfino", country: "Grens DE/PL", lat: 53.254944, lng: 14.441861 },
  { city: "Krajnik Dolny – Schwedt", country: "Grens DE/PL", lat: 53.035083, lng: 14.311639 },
  { city: "Küstrin-Kietz – Kostrzyn", country: "Grens DE/PL", lat: 52.578750, lng: 14.628556 },
  { city: "Słubice – Frankfurt", country: "Grens DE/PL", lat: 52.347833, lng: 14.555111 },
  { city: "Świecko – Frankfurt", country: "Grens DE/PL", lat: 52.315472, lng: 14.577667 },
  { city: "Forst – Olszyna", country: "Grens DE/PL", lat: 51.666806, lng: 14.752694 },
  { city: "Bad Muskau – Łęknica", country: "Grens DE/PL", lat: 51.525972, lng: 14.735472 },
  { city: "Jędrzychowice – Ludwigsdorf", country: "Grens DE/PL", lat: 51.180750, lng: 15.008556 },
  { city: "Zittau – Sieniawka", country: "Grens DE/PL", lat: 50.901250, lng: 14.844222 },
  { city: "Schmilka – Hřensko", country: "Grens DE/CZ", lat: 50.887750, lng: 14.234250 },
  { city: "Breitenau – Krásný Les", country: "Grens DE/CZ", lat: 50.783083, lng: 13.898444 },
  { city: "Zinnwald – Teplice", country: "Grens DE/CZ", lat: 50.735250, lng: 13.757444 },
  { city: "Reitzenhain – Hora Svatého Šebestiána", country: "Grens DE/CZ", lat: 50.547556, lng: 13.225389 },
  { city: "Oberwiesenthal – Boží Dar", country: "Grens DE/CZ", lat: 50.411083, lng: 12.936472 },
  { city: "Schönberg – Vojtanov", country: "Grens DE/CZ", lat: 50.172750, lng: 12.315222 },
  { city: "Schirnding – Pomezí nad Ohří", country: "Grens DE/CZ", lat: 50.086583, lng: 12.254278 },
  { city: "Waldsassen – Cheb", country: "Grens DE/CZ", lat: 50.039639, lng: 12.338111 },
  { city: "Waidhaus – Rozvadov", country: "Grens DE/CZ", lat: 49.642528, lng: 12.522000 },
  { city: "Furth im Wald – Folmava", country: "Grens DE/CZ", lat: 49.340778, lng: 12.850167 },
  { city: "Eisenstein – Železná Ruda", country: "Grens DE/CZ", lat: 49.122806, lng: 13.204583 },
  { city: "Philippsreut – Strážný", country: "Grens DE/CZ", lat: 48.881028, lng: 13.704444 },
  { city: "Passau – Suben", country: "Grens DE/AT", lat: 48.411000, lng: 13.425472 },
  { city: "Kirchdorf am Inn – Braunau", country: "Grens DE/AT", lat: 48.249639, lng: 13.009556 },
  { city: "Bad Reichenhall – Salzburg", country: "Grens DE/AT", lat: 47.768361, lng: 12.943306 },
  { city: "Schellenberger Forst – Hallein", country: "Grens DE/AT", lat: 47.714056, lng: 13.043000 },
  { city: "Kiefersfelden – Kufstein", country: "Grens DE/AT", lat: 47.605000, lng: 12.193444 },
  { city: "Füssen – Vils", country: "Grens DE/AT", lat: 47.559278, lng: 10.656806 },
  { city: "Hörbranz – Lindau", country: "Grens DE/AT", lat: 47.547250, lng: 9.735833 },
  { city: "Konstanz – Kreuzlingen", country: "Grens DE/CH", lat: 47.661778, lng: 9.161194 },
  { city: "Bietingen – Thayngen", country: "Grens DE/CH", lat: 47.740556, lng: 8.719222 },
  { city: "Weil am Rhein – Basel", country: "Grens DE/CH", lat: 47.586111, lng: 7.602028 },
  { city: "Kehl – Straatsburg", country: "Grens DE/FR", lat: 48.573806, lng: 7.801889 },
  { city: "Scheibenhard – Scheibenhardt", country: "Grens DE/FR", lat: 48.978444, lng: 8.157333 },
  { city: "Saarbrücken – Forbach", country: "Grens DE/FR", lat: 49.203750, lng: 6.957917 },
  { city: "Überherrn – Creutzwald", country: "Grens DE/FR", lat: 49.221167, lng: 6.719361 },
  { city: "Perl – Schengen", country: "Grens DE/LU", lat: 49.479167, lng: 6.367222 },
  { city: "Mesenich – Mertert", country: "Grens DE/LU", lat: 49.733139, lng: 6.501917 },
];

const ALL = [...BORDER_CROSSINGS, ...EXTRA, ...CITIES];

// Probeer een snelweg-naam te herkennen — we tonen geen losse snelweg op de kaart maar
// wel de plaatsen die er aan grenzen via de andere waypoints.
const HIGHWAY_RE = /^A\d{1,3}(\/A\d{1,3})?$/i;

export function isHighwayName(s: string): boolean {
  return HIGHWAY_RE.test(s.trim());
}

// Normaliseer scheidingstekens (/, -, –, en) naar spaties zodat we
// 'Tegelen/Kaldenkirchen', 'Tegelen - Kaldenkirchen' enz. herkennen.
const normalize = (s: string) =>
  s.toLowerCase().replace(/[\/\-–—]|(\b(en|and)\b)/g, " ").replace(/\s+/g, " ").trim();

export function geocodeWaypoint(name: string): GeoPoint | null {
  if (!name) return null;
  const q = normalize(name);

  // 1) Grensovergangen eerst — exact of als beide plaatsnamen voorkomen
  for (const bc of BORDER_CROSSINGS) {
    const parts = bc.city.toLowerCase().split(" ").filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => q.includes(p))) return bc;
  }

  // 2) Exacte plaatsnaam
  const exact = ALL.find((c) => c.city.toLowerCase() === q);
  if (exact) return exact;

  // 3) Bevat een bekende plaats (langste match eerst → vermijdt 'Tegelen' in 'Tegelen Kaldenkirchen')
  const sorted = [...ALL].sort((a, b) => b.city.length - a.city.length);
  const partial = sorted.find((c) => q.includes(c.city.toLowerCase()));
  if (partial) return partial;

  return geocodeCity(name);
}
