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
  { city: "Tegelen Nettetal", country: "Grens NL/DE", lat: 51.333115, lng: 6.169855 },
  { city: "Venlo Straelen", country: "Grens NL/DE", lat: 51.384219, lng: 6.216112 },
  { city: "Roermond Elmpt", country: "Grens NL/DE", lat: 51.200586, lng: 6.070845 },
  { city: "Sittard Selfkant", country: "Grens NL/DE", lat: 51.031602, lng: 5.876813 },
  { city: "Bocholtz Herzogenrath", country: "Grens NL/DE", lat: 50.818887, lng: 6.024716 },
  { city: "Withuis Moelingen", country: "Grens NL/BE", lat: 50.764330, lng: 5.721239 },
  { city: "Eijsden Moelingen", country: "Grens NL/BE", lat: 50.754985, lng: 5.696373 },
  { city: "Smeermaas Maastricht", country: "Grens NL/BE", lat: 50.880928, lng: 5.673229 },
  { city: "Veldwezelt Maastricht", country: "Grens NL/BE", lat: 50.858774, lng: 5.644226 },
  { city: "Vroenhoven Maastricht", country: "Grens NL/BE", lat: 50.833134, lng: 5.648032 },
  { city: "Elsloo Maasmechelen", country: "Grens NL/BE", lat: 50.958522, lng: 5.754253 },
  { city: "Roosteren Maaseik", country: "Grens NL/BE", lat: 51.092986, lng: 5.798304 },
  { city: "Ittervoort Kessenich", country: "Grens NL/BE", lat: 51.158889, lng: 5.813385 },
  { city: "Stramproy Molenbeersel", country: "Grens NL/BE", lat: 51.184584, lng: 5.725385 },
  { city: "Bergeijk Lommel", country: "Grens NL/BE", lat: 51.266760, lng: 5.396067 },
  { city: "Hapert Postel", country: "Grens NL/BE", lat: 51.318833, lng: 5.209028 },
  { city: "Goirle Poppel", country: "Grens NL/BE", lat: 51.470796, lng: 5.048247 },
  { city: "Baarle Nassau Weelde", country: "Grens NL/BE", lat: 51.401875, lng: 4.936812 },
  { city: "Hazeldonk Meer", country: "Grens NL/BE", lat: 51.485904, lng: 4.735467 },
  { city: "Zundert Wuustwezel", country: "Grens NL/BE", lat: 51.426593, lng: 4.623757 },
  { city: "Ossendrecht Zandvliet", country: "Grens NL/BE", lat: 51.376908, lng: 4.304169 },
  { city: "Hulst Stekene", country: "Grens NL/BE", lat: 51.247627, lng: 4.064444 },
  { city: "Westdorpe Zelzate", country: "Grens NL/BE", lat: 51.209175, lng: 3.824539 },
  { city: "Sas van Gent Zelzate", country: "Grens NL/BE", lat: 51.210590, lng: 3.800742 },
  { city: "Eede Maldegem", country: "Grens NL/BE", lat: 51.241402, lng: 3.448443 },
  { city: "Sluis Knokke", country: "Grens NL/BE", lat: 51.314727, lng: 3.358539 },
  { city: "Gennep Goch", country: "Grens NL/DE", lat: 51.674848, lng: 6.034571 },
  { city: "Ottersum Grunewald", country: "Grens NL/DE", lat: 51.717030, lng: 6.045059 },
  { city: "Nijmegen Kranenburg", country: "Grens NL/DE", lat: 51.816152, lng: 5.957811 },
  { city: "Beek Elten", country: "Grens NL/DE", lat: 51.898694, lng: 6.165667 },
  { city: "Glanerbrug Gronau", country: "Grens NL/DE", lat: 52.193449, lng: 6.962237 },
  { city: "De Lutte Bad Bentheim", country: "Grens NL/DE", lat: 52.313686, lng: 7.043212 },
  { city: "Denekamp Nordhorn", country: "Grens NL/DE", lat: 52.403243, lng: 7.035178 },
  { city: "Coevorden Laar", country: "Grens NL/DE", lat: 52.647119, lng: 6.755702 },
  { city: "Schoonebeek Emlichheim", country: "Grens NL/DE", lat: 52.653039, lng: 6.872336 },
  { city: "Zwarte Meer Meppen", country: "Grens NL/DE", lat: 52.722530, lng: 7.064155 },
  { city: "Ter Apel Rutenbrock", country: "Grens NL/DE", lat: 52.848286, lng: 7.087902 },
  { city: "Bad Nieuweschans Bunde", country: "Grens NL/DE", lat: 53.180464, lng: 7.227212 },
  { city: "Eynatten Lichtenbusch", country: "Grens BE/DE", lat: 50.718344, lng: 6.120243 },
  { city: "Kelmis Aken", country: "Grens BE/DE", lat: 50.726118, lng: 6.033226 },
  { city: "Raeren Aachen", country: "Grens BE/DE", lat: 50.721931, lng: 6.090238 },
  { city: "Sankt Vith Winterspelt", country: "Grens BE/DE", lat: 50.237289, lng: 6.181250 },
  { city: "Wemperhardt Weiswampach", country: "Grens BE/LU", lat: 50.156343, lng: 6.052220 },
  { city: "Gouvy Schmett", country: "Grens BE/LU", lat: 50.182432, lng: 6.022474 },
  { city: "Bastogne Bohey", country: "Grens BE/LU", lat: 49.981442, lng: 5.837805 },
  { city: "Aarlen Gaichel", country: "Grens BE/LU", lat: 49.694516, lng: 5.867514 },
  { city: "Aarlen Steinfort", country: "Grens BE/LU", lat: 49.658824, lng: 5.903923 },
  { city: "Sterpenich Steinfort", country: "Grens BE/LU", lat: 49.638518, lng: 5.906325 },
  { city: "Aubange Petange", country: "Grens BE/LU", lat: 49.560639, lng: 5.843792 },
  { city: "Aubange Longwy", country: "Grens BE/FR", lat: 49.550388, lng: 5.807073 },
  { city: "Bouillon Bazeilles", country: "Grens BE/FR", lat: 49.762303, lng: 5.062765 },
  { city: "Bruly Rocroi", country: "Grens BE/FR", lat: 49.962863, lng: 4.533248 },
  { city: "Bergen Maubeuge", country: "Grens BE/FR", lat: 50.343152, lng: 3.970717 },
  { city: "Quievrain Quievrechain", country: "Grens BE/FR", lat: 50.403582, lng: 3.674532 },
  { city: "Hensies Saint-Aybert", country: "Grens BE/FR", lat: 50.438775, lng: 3.668722 },
  { city: "Peruwelz Conde-sur-Escaut", country: "Grens BE/FR", lat: 50.496954, lng: 3.607198 },
  { city: "Brunehaut Maulde", country: "Grens BE/FR", lat: 50.505255, lng: 3.429967 },
  { city: "Rumes Mouchin", country: "Grens BE/FR", lat: 50.529351, lng: 3.286444 },
  { city: "Doornik Baisieux", country: "Grens BE/FR", lat: 50.603846, lng: 3.274485 },
  { city: "Moeskroen Tourcoing", country: "Grens BE/FR", lat: 50.764528, lng: 3.168529 },
  { city: "Poperinge Steenvoorde", country: "Grens BE/FR", lat: 50.817135, lng: 2.675867 },
  { city: "De Panne Gijvelde", country: "Grens BE/FR", lat: 51.057007, lng: 2.562302 },
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
