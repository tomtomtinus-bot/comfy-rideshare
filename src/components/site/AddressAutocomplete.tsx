import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AddressResult {
  display: string;
  address: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  main: string;
  secondary: string;
}

// Volledige lijst van grensovergangen Nederland ↔ België
// Bron: Rijkswaterstaat / NGI BE — alle wegverbindingen die de NL/BE-grens kruisen
const NL_BE_BORDERS: AddressResult[] = [
  // Zeeuws-Vlaanderen (West)
  { display: "🌍 Cadzand — Knokke-Heist (N675)", address: "Cadzand", city: "Sluis", country: "NL/BE", lat: 51.3560, lng: 3.3487 },
  { display: "🌍 Sluis — Westkapelle (N376/N49)", address: "Sluis", city: "Sluis", country: "NL/BE", lat: 51.3203, lng: 3.4095 },
  { display: "🌍 Eede — Maldegem (N251/N410)", address: "Eede", city: "Sluis", country: "NL/BE", lat: 51.2279, lng: 3.4443 },
  { display: "🌍 Sint Anna ter Muiden — Westkapelle", address: "Sint Anna ter Muiden", city: "Sluis", country: "NL/BE", lat: 51.3149, lng: 3.3331 },
  { display: "🌍 Heille — Middelburg (B)", address: "Heille", city: "Sluis", country: "NL/BE", lat: 51.2767, lng: 3.4192 },
  { display: "🌍 Sint Kruis — Maldegem", address: "Sint Kruis", city: "Sluis", country: "NL/BE", lat: 51.2408, lng: 3.4700 },
  { display: "🌍 Aardenburg — Maldegem (N410)", address: "Aardenburg", city: "Sluis", country: "NL/BE", lat: 51.2413, lng: 3.4475 },
  // Zeeuws-Vlaanderen (Midden/Oost)
  { display: "🌍 Sas van Gent — Zelzate (N252/N49)", address: "Sas van Gent", city: "Terneuzen", country: "NL/BE", lat: 51.2244, lng: 3.8047 },
  { display: "🌍 Westdorpe — Zelzate (N683)", address: "Westdorpe", city: "Terneuzen", country: "NL/BE", lat: 51.2272, lng: 3.8264 },
  { display: "🌍 Overslag — Wachtebeke", address: "Overslag", city: "Terneuzen", country: "NL/BE", lat: 51.1942, lng: 3.8837 },
  { display: "🌍 Koewacht — Moerbeke", address: "Koewacht", city: "Terneuzen", country: "NL/BE", lat: 51.2015, lng: 3.9557 },
  { display: "🌍 De Klinge — Sint-Gillis-Waas", address: "De Klinge", city: "Hulst", country: "NL/BE", lat: 51.2378, lng: 4.1108 },
  { display: "🌍 Clinge — Sint-Gillis-Waas (N403)", address: "Clinge", city: "Hulst", country: "NL/BE", lat: 51.2434, lng: 4.1089 },
  { display: "🌍 Nieuw-Namen — Kieldrecht (N451)", address: "Nieuw-Namen", city: "Hulst", country: "NL/BE", lat: 51.2910, lng: 4.1691 },
  { display: "🌍 Kapellebrug — Sint-Niklaas (N60)", address: "Kapellebrug", city: "Hulst", country: "NL/BE", lat: 51.2106, lng: 4.0838 },
  // West-Brabant
  { display: "🌍 Putte — Kapellen (A4/E19)", address: "Putte", city: "Woensdrecht", country: "NL/BE", lat: 51.3372, lng: 4.4126 },
  { display: "🌍 Putte-Stabroek (N111)", address: "Putte", city: "Woensdrecht", country: "NL/BE", lat: 51.3739, lng: 4.3722 },
  { display: "🌍 Ossendrecht — Kalmthout", address: "Ossendrecht", city: "Woensdrecht", country: "NL/BE", lat: 51.3894, lng: 4.4015 },
  { display: "🌍 Huijbergen — Essen (N289)", address: "Huijbergen", city: "Woensdrecht", country: "NL/BE", lat: 51.4505, lng: 4.4233 },
  { display: "🌍 Wernhout — Wuustwezel (N263/N1)", address: "Wernhout", city: "Zundert", country: "NL/BE", lat: 51.4231, lng: 4.6206 },
  { display: "🌍 Zundert — Meer (A16/E19, Hazeldonk)", address: "Hazeldonk", city: "Breda", country: "NL/BE", lat: 51.4665, lng: 4.6966 },
  { display: "🌍 Meersel-Dreef — Galder", address: "Galder", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4486, lng: 4.7708 },
  { display: "🌍 Strijbeek — Meerle (N639)", address: "Strijbeek", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4877, lng: 4.8016 },
  { display: "🌍 Castelré — Minderhout", address: "Castelré", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4199, lng: 4.7743 },
  // Baarle-Nassau / Hertog (enclaves)
  { display: "🌍 Baarle-Nassau / Baarle-Hertog (N260)", address: "Baarle-Nassau", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4444, lng: 4.9281 },
  { display: "🌍 Ulicoten — Baarle-Hertog (N132)", address: "Ulicoten", city: "Baarle-Nassau", country: "NL/BE", lat: 51.4482, lng: 4.8940 },
  { display: "🌍 Chaam — Hoogstraten", address: "Chaam", city: "Alphen-Chaam", country: "NL/BE", lat: 51.4533, lng: 4.8114 },
  // Midden-Brabant
  { display: "🌍 Goirle — Poppel (N269)", address: "Goirle", city: "Goirle", country: "NL/BE", lat: 51.4766, lng: 5.0383 },
  { display: "🌍 Hilvarenbeek — Weelde (N269)", address: "Hilvarenbeek", city: "Hilvarenbeek", country: "NL/BE", lat: 51.4471, lng: 5.0688 },
  { display: "🌍 Reusel — Arendonk (N284/N18)", address: "Reusel", city: "Reusel-De Mierden", country: "NL/BE", lat: 51.3886, lng: 5.1317 },
  { display: "🌍 Bladel — Lommel (N284)", address: "Bladel", city: "Bladel", country: "NL/BE", lat: 51.3009, lng: 5.2712 },
  { display: "🌍 Eersel — Lommel (A67/E34, Postel)", address: "Eersel", city: "Eersel", country: "NL/BE", lat: 51.3119, lng: 5.3245 },
  { display: "🌍 Bergeijk — Lommel (N69)", address: "Bergeijk", city: "Bergeijk", country: "NL/BE", lat: 51.2759, lng: 5.3323 },
  { display: "🌍 Borkel en Schaft — Achel (N69)", address: "Borkel en Schaft", city: "Valkenswaard", country: "NL/BE", lat: 51.3186, lng: 5.4103 },
  { display: "🌍 Valkenswaard — Hamont (N72)", address: "Valkenswaard", city: "Valkenswaard", country: "NL/BE", lat: 51.2857, lng: 5.5018 },
  { display: "🌍 Budel — Hamont-Achel (N274)", address: "Budel", city: "Cranendonck", country: "NL/BE", lat: 51.2647, lng: 5.5274 },
  { display: "🌍 Soerendonk — Bocholt", address: "Soerendonk", city: "Cranendonck", country: "NL/BE", lat: 51.2379, lng: 5.5751 },
  { display: "🌍 Weert — Bocholt (N57/N73)", address: "Weert", city: "Weert", country: "NL/BE", lat: 51.2043, lng: 5.6413 },
  { display: "🌍 Stramproy — Bree (N292)", address: "Stramproy", city: "Weert", country: "NL/BE", lat: 51.1674, lng: 5.6605 },
  // Limburg (Maaskruisingen + Voerstreek)
  { display: "🌍 Kessenich — Ohé en Laak", address: "Kessenich", city: "Maasgouw", country: "NL/BE", lat: 51.1500, lng: 5.7733 },
  { display: "🌍 Maaseik — Roosteren (N78)", address: "Roosteren", city: "Echt-Susteren", country: "NL/BE", lat: 51.1642, lng: 5.7861 },
  { display: "🌍 Dilsen — Berg aan de Maas", address: "Berg aan de Maas", city: "Stein", country: "NL/BE", lat: 51.0125, lng: 5.7639 },
  { display: "🌍 Stein — Stokkem (Maasveer)", address: "Stein", city: "Stein", country: "NL/BE", lat: 50.9794, lng: 5.7517 },
  { display: "🌍 Born — Maasmechelen (A2/E25)", address: "Born", city: "Sittard-Geleen", country: "NL/BE", lat: 51.0083, lng: 5.7717 },
  { display: "🌍 Urmond — Maasmechelen", address: "Urmond", city: "Stein", country: "NL/BE", lat: 50.9758, lng: 5.7600 },
  { display: "🌍 Maastricht-West — Lanaken (N78/Tongerseweg)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8715, lng: 5.6566 },
  { display: "🌍 Smeermaas — Lanaken (N78)", address: "Smeermaas", city: "Maastricht", country: "NL/BE", lat: 50.8736, lng: 5.6764 },
  { display: "🌍 Maastricht — Vroenhoven (N79/N619)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8497, lng: 5.6678 },
  { display: "🌍 Maastricht — Veldwezelt (N2)", address: "Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.8639, lng: 5.6597 },
  { display: "🌍 Eijsden — Visé (N278/N618)", address: "Eijsden", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7658, lng: 5.7036 },
  { display: "🌍 Mesch — Mouland", address: "Mesch", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7714, lng: 5.7333 },
  { display: "🌍 Noorbeek — 's-Gravenvoeren (N597)", address: "Noorbeek", city: "Eijsden-Margraten", country: "NL/BE", lat: 50.7747, lng: 5.7800 },
  { display: "🌍 Slenaken — Sint-Martens-Voeren", address: "Slenaken", city: "Gulpen-Wittem", country: "NL/BE", lat: 50.7586, lng: 5.8371 },
  { display: "🌍 Epen — Teuven (N598)", address: "Epen", city: "Gulpen-Wittem", country: "NL/BE", lat: 50.7641, lng: 5.8933 },

  // === NL ↔ Duitsland ===
  // Groningen
  { display: "🌍 Bad Nieuweschans — Bunde (A7/E22)", address: "Bad Nieuweschans", city: "Oldambt", country: "NL/DE", lat: 53.1842, lng: 7.2147 },
  { display: "🌍 Vlagtwedde — Rhede (Ems)", address: "Vlagtwedde", city: "Westerwolde", country: "NL/DE", lat: 53.0367, lng: 7.1417 },
  { display: "🌍 Ter Apel — Haren (N976)", address: "Ter Apel", city: "Westerwolde", country: "NL/DE", lat: 52.8324, lng: 7.1509 },
  // Drenthe
  { display: "🌍 Zwartemeer — Twist (N379)", address: "Zwartemeer", city: "Emmen", country: "NL/DE", lat: 52.6849, lng: 7.0687 },
  { display: "🌍 Klazienaveen — Schöninghsdorf", address: "Klazienaveen", city: "Emmen", country: "NL/DE", lat: 52.7171, lng: 7.0426 },
  { display: "🌍 Coevorden — Laar (B403)", address: "Coevorden", city: "Coevorden", country: "NL/DE", lat: 52.6375, lng: 6.7411 },
  { display: "🌍 Schoonebeek — Twist", address: "Schoonebeek", city: "Emmen", country: "NL/DE", lat: 52.6558, lng: 6.9898 },
  // Overijssel
  { display: "🌍 Hardenberg — Emlichheim (N343)", address: "Hardenberg", city: "Hardenberg", country: "NL/DE", lat: 52.5937, lng: 6.7358 },
  { display: "🌍 Denekamp — Nordhorn (N342)", address: "Denekamp", city: "Dinkelland", country: "NL/DE", lat: 52.4053, lng: 7.0380 },
  { display: "🌍 De Lutte — Bad Bentheim (A1/A30)", address: "De Lutte", city: "Losser", country: "NL/DE", lat: 52.3107, lng: 7.0534 },
  { display: "🌍 Losser — Gronau (N733)", address: "Losser", city: "Losser", country: "NL/DE", lat: 52.2611, lng: 7.0231 },
  { display: "🌍 Glanerbrug — Gronau (N35)", address: "Glanerbrug", city: "Enschede", country: "NL/DE", lat: 52.2167, lng: 6.9892 },
  { display: "🌍 Buurse — Alstätte (N347)", address: "Buurse", city: "Haaksbergen", country: "NL/DE", lat: 52.1370, lng: 6.8723 },
  // Gelderland (Achterhoek)
  { display: "🌍 Rekken — Vreden (N822)", address: "Rekken", city: "Berkelland", country: "NL/DE", lat: 52.0660, lng: 6.7733 },
  { display: "🌍 Winterswijk — Vreden (N319)", address: "Winterswijk", city: "Winterswijk", country: "NL/DE", lat: 52.0019, lng: 6.7808 },
  { display: "🌍 Winterswijk — Borken (N318/B70)", address: "Winterswijk", city: "Winterswijk", country: "NL/DE", lat: 51.9062, lng: 6.7981 },
  { display: "🌍 Aalten — Bocholt (N818)", address: "Aalten", city: "Aalten", country: "NL/DE", lat: 51.8762, lng: 6.5961 },
  { display: "🌍 Dinxperlo — Suderwick (N817)", address: "Dinxperlo", city: "Aalten", country: "NL/DE", lat: 51.8589, lng: 6.5006 },
  { display: "🌍 Megchelen — Anholt", address: "Megchelen", city: "Oude IJsselstreek", country: "NL/DE", lat: 51.8424, lng: 6.4099 },
  { display: "🌍 's-Heerenberg — Emmerich (A12/A3, Bergh)", address: "'s-Heerenberg", city: "Montferland", country: "NL/DE", lat: 51.8551, lng: 6.2488 },
  { display: "🌍 Beek — Emmerich (N816)", address: "Beek", city: "Montferland", country: "NL/DE", lat: 51.9125, lng: 6.2125 },
  { display: "🌍 Millingen — Kleve (N840)", address: "Millingen aan de Rijn", city: "Berg en Dal", country: "NL/DE", lat: 51.8650, lng: 6.0428 },
  { display: "🌍 Wyler — Kranenburg (N325/B504)", address: "Wyler", city: "Berg en Dal", country: "NL/DE", lat: 51.8040, lng: 5.9662 },
  { display: "🌍 Groesbeek — Kranenburg", address: "Groesbeek", city: "Berg en Dal", country: "NL/DE", lat: 51.7717, lng: 5.9558 },
  // Limburg
  { display: "🌍 Mook — Goch (B9)", address: "Mook", city: "Mook en Middelaar", country: "NL/DE", lat: 51.7544, lng: 5.8769 },
  { display: "🌍 Gennep — Goch (N291)", address: "Gennep", city: "Gennep", country: "NL/DE", lat: 51.6858, lng: 6.0769 },
  { display: "🌍 Bergen — Weeze (N271)", address: "Bergen", city: "Bergen (L)", country: "NL/DE", lat: 51.5972, lng: 6.0392 },
  { display: "🌍 Arcen — Straelen (N271)", address: "Arcen", city: "Venlo", country: "NL/DE", lat: 51.4601, lng: 6.2240 },
  { display: "🌍 Venlo — Kaldenkirchen (A67/A40)", address: "Venlo", city: "Venlo", country: "NL/DE", lat: 51.3566, lng: 6.1745 },
  { display: "🌍 Tegelen — Kaldenkirchen", address: "Tegelen", city: "Venlo", country: "NL/DE", lat: 51.3361, lng: 6.1428 },
  { display: "🌍 Belfeld — Brüggen (N271/B221)", address: "Belfeld", city: "Venlo", country: "NL/DE", lat: 51.2770, lng: 6.1470 },
  { display: "🌍 Swalmen — Brüggen", address: "Swalmen", city: "Roermond", country: "NL/DE", lat: 51.2372, lng: 6.1084 },
  { display: "🌍 Vlodrop — Wassenberg (N293)", address: "Vlodrop", city: "Roerdalen", country: "NL/DE", lat: 51.1164, lng: 6.1170 },
  { display: "🌍 Sittard — Wehr/Tüddern (N297)", address: "Sittard", city: "Sittard-Geleen", country: "NL/DE", lat: 50.9989, lng: 5.8806 },
  { display: "🌍 Schinveld — Gangelt", address: "Schinveld", city: "Beekdaelen", country: "NL/DE", lat: 50.9813, lng: 5.9872 },
  { display: "🌍 Brunssum — Übach-Palenberg (N299)", address: "Brunssum", city: "Brunssum", country: "NL/DE", lat: 50.9322, lng: 6.0417 },
  { display: "🌍 Heerlen — Aachen (A76/A4)", address: "Bocholtz", city: "Simpelveld", country: "NL/DE", lat: 50.8161, lng: 6.0331 },
  { display: "🌍 Kerkrade — Herzogenrath (N299)", address: "Kerkrade", city: "Kerkrade", country: "NL/DE", lat: 50.8636, lng: 6.0750 },
  { display: "🌍 Bocholtz — Vetschau (N281)", address: "Bocholtz", city: "Simpelveld", country: "NL/DE", lat: 50.8175, lng: 6.0392 },
  { display: "🌍 Vaals — Aachen (N278)", address: "Vaals", city: "Vaals", country: "NL/DE", lat: 50.7714, lng: 6.0119 },

  // === BE ↔ Frankrijk ===
  { display: "🌍 De Panne — Bray-Dunes (N39/D947)", address: "De Panne", city: "De Panne", country: "BE/FR", lat: 51.0900, lng: 2.5811 },
  { display: "🌍 Adinkerke — Ghyvelde (D2/A18)", address: "Adinkerke", city: "De Panne", country: "BE/FR", lat: 51.0637, lng: 2.5643 },
  { display: "🌍 Veurne — Hondschoote (N8/D947)", address: "Veurne", city: "Veurne", country: "BE/FR", lat: 51.0266, lng: 2.6242 },
  { display: "🌍 Houthem — Killem (N365/D110)", address: "Houthem", city: "Komen-Waasten", country: "BE/FR", lat: 50.7650, lng: 2.9417 },
  { display: "🌍 Komen — Warneton (N58)", address: "Komen", city: "Komen-Waasten", country: "BE/FR", lat: 50.7619, lng: 2.9925 },
  { display: "🌍 Ploegsteert — Le Bizet", address: "Ploegsteert", city: "Komen-Waasten", country: "BE/FR", lat: 50.7333, lng: 2.8833 },
  { display: "🌍 Menen — Halluin (A14/E17)", address: "Menen", city: "Menen", country: "BE/FR", lat: 50.7882, lng: 3.1460 },
  { display: "🌍 Wervik — Bousbecque", address: "Wervik", city: "Wervik", country: "BE/FR", lat: 50.7833, lng: 3.0431 },
  { display: "🌍 Mouscron — Roubaix (N512/D752)", address: "Moeskroen", city: "Mouscron", country: "BE/FR", lat: 50.7176, lng: 3.1942 },
  { display: "🌍 Doornik — Lille (A8/E429)", address: "Doornik", city: "Tournai", country: "BE/FR", lat: 50.6111, lng: 3.3886 },
  { display: "🌍 Hertain — Néchin (N511)", address: "Hertain", city: "Doornik", country: "BE/FR", lat: 50.6370, lng: 3.2662 },
  { display: "🌍 Bléharies — Mortagne-du-Nord", address: "Bléharies", city: "Brunehaut", country: "BE/FR", lat: 50.5067, lng: 3.4233 },
  { display: "🌍 Hensies — Crespin (E19/A2)", address: "Hensies", city: "Hensies", country: "BE/FR", lat: 50.4252, lng: 3.6731 },
  { display: "🌍 Quiévrain — Quiévrechain (N51)", address: "Quiévrain", city: "Quiévrain", country: "BE/FR", lat: 50.4117, lng: 3.6767 },
  { display: "🌍 Roisin — Bavay", address: "Roisin", city: "Honnelles", country: "BE/FR", lat: 50.3155, lng: 3.7444 },
  { display: "🌍 Erquennes — Mecquignies", address: "Erquennes", city: "Honnelles", country: "BE/FR", lat: 50.3165, lng: 3.7978 },
  { display: "🌍 Maubray — Maulde", address: "Maubray", city: "Antoing", country: "BE/FR", lat: 50.5274, lng: 3.4676 },
  { display: "🌍 Sivry-Rance — Trélon (N53)", address: "Sivry", city: "Sivry-Rance", country: "BE/FR", lat: 50.1146, lng: 4.1574 },
  { display: "🌍 Chimay — Hirson (N99)", address: "Chimay", city: "Chimay", country: "BE/FR", lat: 50.0481, lng: 4.3164 },
  { display: "🌍 Couvin — Rocroi (E420/N5)", address: "Couvin", city: "Couvin", country: "BE/FR", lat: 49.9887, lng: 4.5087 },
  { display: "🌍 Cul-des-Sarts — Rocroi", address: "Cul-des-Sarts", city: "Couvin", country: "BE/FR", lat: 49.9433, lng: 4.4877 },
  { display: "🌍 Bouillon — Sedan (N89/D6)", address: "Bouillon", city: "Bouillon", country: "BE/FR", lat: 49.7492, lng: 5.0053 },
  { display: "🌍 Florenville — Margut (N40/D981)", address: "Florenville", city: "Florenville", country: "BE/FR", lat: 49.6417, lng: 5.2851 },
  { display: "🌍 Aubange — Mont-Saint-Martin (E411)", address: "Aubange", city: "Aubange", country: "BE/FR", lat: 49.5611, lng: 5.7958 },
  { display: "🌍 Athus — Longwy", address: "Athus", city: "Aubange", country: "BE/FR", lat: 49.5381, lng: 5.7993 },

  // === BE ↔ Luxemburg ===
  { display: "🌍 Sterpenich — Stockem (E25/E411/A4)", address: "Sterpenich", city: "Aarlen", country: "BE/LU", lat: 49.6686, lng: 5.9139 },
  { display: "🌍 Aarlen — Steinfort (N4)", address: "Aarlen", city: "Arlon", country: "BE/LU", lat: 49.6679, lng: 5.8697 },
  { display: "🌍 Martelange — Rambrouch (N4)", address: "Martelange", city: "Martelange", country: "BE/LU", lat: 49.8224, lng: 5.7881 },
  { display: "🌍 Bastenaken — Wiltz (N84)", address: "Bastenaken", city: "Bastogne", country: "BE/LU", lat: 49.9845, lng: 5.8247 },
  { display: "🌍 Houffalize — Clervaux (N30)", address: "Houffalize", city: "Houffalize", country: "BE/LU", lat: 50.0936, lng: 5.9081 },
  { display: "🌍 Burg-Reuland — Troisvierges", address: "Burg-Reuland", city: "Burg-Reuland", country: "BE/LU", lat: 50.1590, lng: 6.0682 },

  // === BE ↔ Duitsland (Oostkantons) ===
  { display: "🌍 Eynatten — Lichtenbusch (E40/A3)", address: "Eynatten", city: "Raeren", country: "BE/DE", lat: 50.6958, lng: 6.1264 },
  { display: "🌍 Raeren — Roetgen (N68)", address: "Raeren", city: "Raeren", country: "BE/DE", lat: 50.6736, lng: 6.1472 },
  { display: "🌍 Eupen — Aachen (N67)", address: "Eupen", city: "Eupen", country: "BE/DE", lat: 50.7035, lng: 6.0576 },
  { display: "🌍 Kelmis (La Calamine) — Aachen", address: "Kelmis", city: "Kelmis", country: "BE/DE", lat: 50.7459, lng: 6.0486 },
  { display: "🌍 Monschau — Eupen (N68)", address: "Monschau", city: "Monschau", country: "BE/DE", lat: 50.5536, lng: 6.2406 },
  { display: "🌍 Sankt Vith — Losheim (N626)", address: "Sankt Vith", city: "Sankt Vith", country: "BE/DE", lat: 50.3206, lng: 6.2501 },
  { display: "🌍 Bütgenbach — Hellenthal (N676)", address: "Bütgenbach", city: "Bütgenbach", country: "BE/DE", lat: 50.4589, lng: 6.3204 },
  { display: "🌍 Manderfeld — Prüm (N676)", address: "Manderfeld", city: "Büllingen", country: "BE/DE", lat: 50.2690, lng: 6.3825 },
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
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [borderHits, setBorderHits] = useState<AddressResult[]>([]);
  const [allBorders, setAllBorders] = useState<AddressResult[]>([]);
  const [borderFilter, setBorderFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bordersBusy, setBordersBusy] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef<string>(crypto.randomUUID());

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
        const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
          body: { action: "autocomplete", input: v, sessionToken: sessionToken.current },
        });
        if (error) throw error;
        setResults((data?.predictions ?? []) as PlacePrediction[]);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
  };

  const pickPrediction = async (p: PlacePrediction) => {
    onChange(p.description);
    setOpen(false);
    setShowBorders(false);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-autocomplete", {
        body: { action: "details", placeId: p.place_id, sessionToken: sessionToken.current },
      });
      if (error) throw error;
      // Nieuwe sessie na details-call (Google billing best-practice)
      sessionToken.current = crypto.randomUUID();
      onSelect({
        display: data.formatted_address ?? p.description,
        address: p.main,
        city: data.city ?? "",
        country: data.country ?? "",
        lat: Number(data.lat),
        lng: Number(data.lng),
      });
    } catch {
      // fallback zonder coördinaten
      onSelect({ display: p.description, address: p.main, city: "", country: "", lat: 0, lng: 0 });
    }
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
                Adressen (Google)
              </li>
              {results.map((r) => (
                <li
                  key={r.place_id}
                  onClick={() => pickPrediction(r)}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
                >
                  <div className="font-medium">{r.main}</div>
                  {r.secondary && <div className="text-xs text-brass-deep/60">{r.secondary}</div>}
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
};
