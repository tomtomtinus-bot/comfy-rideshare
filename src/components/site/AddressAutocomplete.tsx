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

// Officiële lijst van grensovergangen met exacte coördinaten (PDF ViaCust)
const NL_BE_BORDERS: AddressResult[] = [
  { display: "🌍 A74 Tegelen – A61 Nettetal", address: "A74 Tegelen – A61 Nettetal", city: "Tegelen", country: "NL/DE", lat: 51.333115, lng: 6.169855 },
  { display: "🌍 A67 Venlo – A40 Straelen", address: "A67 Venlo – A40 Straelen", city: "Venlo", country: "NL/DE", lat: 51.384219, lng: 6.216112 },
  { display: "🌍 N280 Roermond – A52 Elmpt", address: "N280 Roermond – A52 Elmpt", city: "Roermond", country: "NL/DE", lat: 51.200586, lng: 6.070845 },
  { display: "🌍 N297 Sittard – B56 Selfkant", address: "N297 Sittard – B56 Selfkant", city: "Sittard", country: "NL/DE", lat: 51.031602, lng: 5.876813 },
  { display: "🌍 A76 Bocholtz – A4 Herzogenrath", address: "A76 Bocholtz – A4 Herzogenrath", city: "Bocholtz", country: "NL/DE", lat: 50.818887, lng: 6.024716 },
  { display: "🌍 Withuis – N627 Moelingen", address: "Withuis – N627 Moelingen", city: "Withuis", country: "NL/BE", lat: 50.764330, lng: 5.721239 },
  { display: "🌍 A2 Eijsden – E25 Moelingen", address: "A2 Eijsden – E25 Moelingen", city: "Eijsden", country: "NL/BE", lat: 50.754985, lng: 5.696373 },
  { display: "🌍 Smeermaas – Maastricht", address: "Smeermaas – Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.880928, lng: 5.673229 },
  { display: "🌍 Veldwezelt – Maastricht", address: "Veldwezelt – Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.858774, lng: 5.644226 },
  { display: "🌍 Vroenhoven – N278 Maastricht", address: "Vroenhoven – N278 Maastricht", city: "Maastricht", country: "NL/BE", lat: 50.833134, lng: 5.648032 },
  { display: "🌍 A76 Elsloo – A2 Maasmechelen", address: "A76 Elsloo – A2 Maasmechelen", city: "Elsloo", country: "NL/BE", lat: 50.958522, lng: 5.754253 },
  { display: "🌍 N296 Roosteren – N78 Maaseik", address: "N296 Roosteren – N78 Maaseik", city: "Roosteren", country: "NL/BE", lat: 51.092986, lng: 5.798304 },
  { display: "🌍 N273 Ittervoort – N78 Kessenich", address: "N273 Ittervoort – N78 Kessenich", city: "Ittervoort", country: "NL/BE", lat: 51.158889, lng: 5.813385 },
  { display: "🌍 N292 Stramproy – N762 Molenbeersel", address: "N292 Stramproy – N762 Molenbeersel", city: "Stramproy", country: "NL/BE", lat: 51.184584, lng: 5.725385 },
  { display: "🌍 N69 Bergeijk – N74 Lommel", address: "N69 Bergeijk – N74 Lommel", city: "Bergeijk", country: "NL/BE", lat: 51.266760, lng: 5.396067 },
  { display: "🌍 A67 Hapert – E34 Postel", address: "A67 Hapert – E34 Postel", city: "Hapert", country: "NL/BE", lat: 51.318834, lng: 5.209028 },
  { display: "🌍 N630 Goirle – N12 Poppel", address: "N630 Goirle – N12 Poppel", city: "Goirle", country: "NL/BE", lat: 51.470796, lng: 5.048247 },
  { display: "🌍 N260 Baarle Nassau – N119 Weelde", address: "N260 Baarle Nassau – N119 Weelde", city: "Baarle-Nassau", country: "NL/BE", lat: 51.401875, lng: 4.936812 },
  { display: "🌍 A16 Hazeldonk – E19 Meer", address: "A16 Hazeldonk – E19 Meer", city: "Hazeldonk", country: "NL/BE", lat: 51.485904, lng: 4.735467 },
  { display: "🌍 Zundert – Wuustwezel", address: "Zundert – Wuustwezel", city: "Zundert", country: "NL/BE", lat: 51.426593, lng: 4.623757 },
  { display: "🌍 A4 Ossendrecht – A12 Zandvliet", address: "A4 Ossendrecht – A12 Zandvliet", city: "Ossendrecht", country: "NL/BE", lat: 51.376908, lng: 4.304169 },
  { display: "🌍 N290 Hulst – N403 Stekene", address: "N290 Hulst – N403 Stekene", city: "Hulst", country: "NL/BE", lat: 51.247627, lng: 4.064444 },
  { display: "🌍 N62 Westdorpe – N423 Zelzate", address: "N62 Westdorpe – N423 Zelzate", city: "Westdorpe", country: "NL/BE", lat: 51.209175, lng: 3.824539 },
  { display: "🌍 N252 Sas van Gent – N474 Zelzate", address: "N252 Sas van Gent – N474 Zelzate", city: "Sas van Gent", country: "NL/BE", lat: 51.210590, lng: 3.800742 },
  { display: "🌍 N251 Eede – N410 Maldegem", address: "N251 Eede – N410 Maldegem", city: "Eede", country: "NL/BE", lat: 51.241402, lng: 3.448443 },
  { display: "🌍 N253 Sluis – N376 Knokke", address: "N253 Sluis – N376 Knokke", city: "Sluis", country: "NL/BE", lat: 51.314727, lng: 3.358539 },
  { display: "🌍 A77 Gennep – A57 Goch", address: "A77 Gennep – A57 Goch", city: "Gennep", country: "NL/DE", lat: 51.674848, lng: 6.034571 },
  { display: "🌍 N291 Ottersum – B504 Grunewald", address: "N291 Ottersum – B504 Grunewald", city: "Ottersum", country: "NL/DE", lat: 51.717030, lng: 6.045059 },
  { display: "🌍 N325 Nijmegen – B9 Kranenburg", address: "N325 Nijmegen – B9 Kranenburg", city: "Nijmegen", country: "NL/DE", lat: 51.816152, lng: 5.957811 },
  { display: "🌍 A12 Beek – A3 Elten", address: "A12 Beek – A3 Elten", city: "Beek", country: "NL/DE", lat: 51.898694, lng: 6.165667 },
  { display: "🌍 N35 Glanenbrug – B53 Gronau", address: "N35 Glanenbrug – B53 Gronau", city: "Glanerbrug", country: "NL/DE", lat: 52.193449, lng: 6.962237 },
  { display: "🌍 A1 De Lutte – A30 Bad Bentheim", address: "A1 De Lutte – A30 Bad Bentheim", city: "De Lutte", country: "NL/DE", lat: 52.313686, lng: 7.043212 },
  { display: "🌍 N342 Denekamp – B213 Nordhorn", address: "N342 Denekamp – B213 Nordhorn", city: "Denekamp", country: "NL/DE", lat: 52.403243, lng: 7.035178 },
  { display: "🌍 N382 Coevorden – B403 Laar", address: "N382 Coevorden – B403 Laar", city: "Coevorden", country: "NL/DE", lat: 52.647119, lng: 6.755702 },
  { display: "🌍 N853 Schoonebeek – Emlicheim", address: "N853 Schoonebeek – Emlicheim", city: "Schoonebeek", country: "NL/DE", lat: 52.653039, lng: 6.872336 },
  { display: "🌍 A37 Zwarte Meer – B402 Meppen", address: "A37 Zwarte Meer – B402 Meppen", city: "Zwartemeer", country: "NL/DE", lat: 52.722530, lng: 7.064155 },
  { display: "🌍 N366 Ter Apel – B408 Rutenbrock", address: "N366 Ter Apel – B408 Rutenbrock", city: "Ter Apel", country: "NL/DE", lat: 52.848286, lng: 7.087902 },
  { display: "🌍 A7 Bad Nieuweschans – A280 Bunde", address: "A7 Bad Nieuweschans – A280 Bunde", city: "Bad Nieuweschans", country: "NL/DE", lat: 53.180464, lng: 7.227212 },
  { display: "🌍 E40 Eynatten – B44 Lichtenbusch", address: "E40 Eynatten – B44 Lichtenbusch", city: "Eynatten", country: "BE/DE", lat: 50.718344, lng: 6.120243 },
  { display: "🌍 N3 Kelmis – B264 Aken", address: "N3 Kelmis – B264 Aken", city: "Kelmis", country: "BE/DE", lat: 50.726118, lng: 6.033226 },
  { display: "🌍 N68 Raeren – B57 Aachen", address: "N68 Raeren – B57 Aachen", city: "Raeren", country: "BE/DE", lat: 50.721931, lng: 6.090238 },
  { display: "🌍 E42 Sankt Vith – E42 Winterspelt", address: "E42 Sankt Vith – E42 Winterspelt", city: "Sankt Vith", country: "BE/DE", lat: 50.237289, lng: 6.181250 },
  { display: "🌍 N62 Wemperhardt – N12 Weiswampach", address: "N62 Wemperhardt – N12 Weiswampach", city: "Wemperhardt", country: "BE/LU", lat: 50.156343, lng: 6.052220 },
  { display: "🌍 N68 Gouvy – N7 Schmett", address: "N68 Gouvy – N7 Schmett", city: "Gouvy", country: "BE/LU", lat: 50.182432, lng: 6.022474 },
  { display: "🌍 N84 Bastonge – N15 Bohey", address: "N84 Bastonge – N15 Bohey", city: "Bastogne", country: "BE/LU", lat: 49.981442, lng: 5.837805 },
  { display: "🌍 N844 Aarlen – N8 Gaichel", address: "N844 Aarlen – N8 Gaichel", city: "Aarlen", country: "BE/LU", lat: 49.694516, lng: 5.867514 },
  { display: "🌍 N4 Aarlen – N6 Steinfort", address: "N4 Aarlen – N6 Steinfort", city: "Aarlen", country: "BE/LU", lat: 49.658824, lng: 5.903923 },
  { display: "🌍 E25 Sterpenich – A6 Steinfort", address: "E25 Sterpenich – A6 Steinfort", city: "Sterpenich", country: "BE/LU", lat: 49.638518, lng: 5.906325 },
  { display: "🌍 N88 Aubange – Petange", address: "N88 Aubange – Petange", city: "Aubange", country: "BE/LU", lat: 49.560639, lng: 5.843792 },
  { display: "🌍 N830 Aubange – E44 Petange", address: "N830 Aubange – E44 Petange", city: "Aubange", country: "BE/LU", lat: 49.553593, lng: 5.842091 },
  { display: "🌍 E411 Aubange – N52 Longwy", address: "E411 Aubange – N52 Longwy", city: "Aubange", country: "BE/FR", lat: 49.550388, lng: 5.807073 },
  { display: "🌍 N883 Aubange – D918 Longwy", address: "N883 Aubange – D918 Longwy", city: "Aubange", country: "BE/FR", lat: 49.555268, lng: 5.787525 },
  { display: "🌍 N89 Bouillon – N58 Bazeilles", address: "N89 Bouillon – N58 Bazeilles", city: "Bouillon", country: "BE/FR", lat: 49.762303, lng: 5.062765 },
  { display: "🌍 N5 Bruly – A304 Rocroi", address: "N5 Bruly – A304 Rocroi", city: "Bruly", country: "BE/FR", lat: 49.962863, lng: 4.533248 },
  { display: "🌍 E420 Bruly – A304 Rocroi", address: "E420 Bruly – A304 Rocroi", city: "Bruly", country: "BE/FR", lat: 49.964406, lng: 4.535416 },
  { display: "🌍 N6 Bergen – N2 Maubeuge", address: "N6 Bergen – N2 Maubeuge", city: "Bergen", country: "BE/FR", lat: 50.343152, lng: 3.970717 },
  { display: "🌍 N51 Quievrain – D630 Quievrechain", address: "N51 Quievrain – D630 Quievrechain", city: "Quiévrain", country: "BE/FR", lat: 50.403582, lng: 3.674532 },
  { display: "🌍 E19 Hensies – A2 Saint-Aybert", address: "E19 Hensies – A2 Saint-Aybert", city: "Hensies", country: "BE/FR", lat: 50.438775, lng: 3.668722 },
  { display: "🌍 N60 Peruwelz – D935 Conde-sur-Escaut", address: "N60 Peruwelz – D935 Conde-sur-Escaut", city: "Peruwelz", country: "BE/FR", lat: 50.496954, lng: 3.607198 },
  { display: "🌍 N507 Brunehaut – D169 Maulde", address: "N507 Brunehaut – D169 Maulde", city: "Brunehaut", country: "BE/FR", lat: 50.505255, lng: 3.429967 },
  { display: "🌍 N508 Rumes – D938 Mouchin", address: "N508 Rumes – D938 Mouchin", city: "Rumes", country: "BE/FR", lat: 50.529351, lng: 3.286444 },
  { display: "🌍 E42 Doornik – A27 Baisieux", address: "E42 Doornik – A27 Baisieux", city: "Doornik", country: "BE/FR", lat: 50.603846, lng: 3.274485 },
  { display: "🌍 N7 Doornik – M941 Baisieux", address: "N7 Doornik – M941 Baisieux", city: "Doornik", country: "BE/FR", lat: 50.607894, lng: 3.270360 },
  { display: "🌍 E17 Moeskroen – E17 Tourcoing", address: "E17 Moeskroen – E17 Tourcoing", city: "Moeskroen", country: "BE/FR", lat: 50.764528, lng: 3.168529 },
  { display: "🌍 N38 Poperingen – D948 Steenvoorde", address: "N38 Poperingen – D948 Steenvoorde", city: "Poperinge", country: "BE/FR", lat: 50.817135, lng: 2.675867 },
  { display: "🌍 E40 De Panne – A16 Gijvelde", address: "E40 De Panne – A16 Gijvelde", city: "De Panne", country: "BE/FR", lat: 51.057007, lng: 2.562302 },
  { display: "🌍 N39 De Panne – D601 Gijvelde", address: "N39 De Panne – D601 Gijvelde", city: "De Panne", country: "BE/FR", lat: 51.069796, lng: 2.559363 },
  // Duitse grenzen
  { display: "🌍 Flensburg – Padborg", address: "Flensburg – Padborg", city: "Flensburg", country: "DE/DK", lat: 54.805667, lng: 9.328472 },
  { display: "🌍 Garz – Świnoujście", address: "Garz – Świnoujście", city: "Garz", country: "DE/PL", lat: 53.891000, lng: 14.213167 },
  { display: "🌍 Lubieszyn – Linken", address: "Lubieszyn – Linken", city: "Linken", country: "DE/PL", lat: 53.453250, lng: 14.371167 },
  { display: "🌍 Kołbaskowo – Pomellen", address: "Kołbaskowo – Pomellen", city: "Pomellen", country: "DE/PL", lat: 53.335639, lng: 14.408444 },
  { display: "🌍 Rosówek – Rosow", address: "Rosówek – Rosow", city: "Rosow", country: "DE/PL", lat: 53.306806, lng: 14.409139 },
  { display: "🌍 Mescherin – Gryfino", address: "Mescherin – Gryfino", city: "Mescherin", country: "DE/PL", lat: 53.254944, lng: 14.441861 },
  { display: "🌍 Krajnik Dolny – Schwedt", address: "Krajnik Dolny – Schwedt", city: "Schwedt", country: "DE/PL", lat: 53.035083, lng: 14.311639 },
  { display: "🌍 Küstrin-Kietz – Kostrzyn", address: "Küstrin-Kietz – Kostrzyn", city: "Küstrin-Kietz", country: "DE/PL", lat: 52.578750, lng: 14.628556 },
  { display: "🌍 Słubice – Frankfurt (Oder)", address: "Słubice – Frankfurt (Oder)", city: "Frankfurt (Oder)", country: "DE/PL", lat: 52.347833, lng: 14.555111 },
  { display: "🌍 Świecko – Frankfurt (Oder)", address: "Świecko – Frankfurt (Oder)", city: "Frankfurt (Oder)", country: "DE/PL", lat: 52.315472, lng: 14.577667 },
  { display: "🌍 Forst – Olszyna", address: "Forst – Olszyna", city: "Forst", country: "DE/PL", lat: 51.666806, lng: 14.752694 },
  { display: "🌍 Bad Muskau – Łęknica", address: "Bad Muskau – Łęknica", city: "Bad Muskau", country: "DE/PL", lat: 51.525972, lng: 14.735472 },
  { display: "🌍 Jędrzychowice – Ludwigsdorf", address: "Jędrzychowice – Ludwigsdorf", city: "Ludwigsdorf", country: "DE/PL", lat: 51.180750, lng: 15.008556 },
  { display: "🌍 Zittau – Sieniawka", address: "Zittau – Sieniawka", city: "Zittau", country: "DE/PL", lat: 50.901250, lng: 14.844222 },
  { display: "🌍 Schmilka – Hřensko", address: "Schmilka – Hřensko", city: "Schmilka", country: "DE/CZ", lat: 50.887750, lng: 14.234250 },
  { display: "🌍 Breitenau – Krásný Les", address: "Breitenau – Krásný Les", city: "Breitenau", country: "DE/CZ", lat: 50.783083, lng: 13.898444 },
  { display: "🌍 Zinnwald – Teplice", address: "Zinnwald – Teplice", city: "Zinnwald", country: "DE/CZ", lat: 50.735250, lng: 13.757444 },
  { display: "🌍 Reitzenhain – Hora Svatého Šebestiána", address: "Reitzenhain – Hora Svatého Šebestiána", city: "Reitzenhain", country: "DE/CZ", lat: 50.547556, lng: 13.225389 },
  { display: "🌍 Oberwiesenthal – Boží Dar", address: "Oberwiesenthal – Boží Dar", city: "Oberwiesenthal", country: "DE/CZ", lat: 50.411083, lng: 12.936472 },
  { display: "🌍 Schönberg – Vojtanov", address: "Schönberg – Vojtanov", city: "Schönberg", country: "DE/CZ", lat: 50.172750, lng: 12.315222 },
  { display: "🌍 Schirnding – Pomezí nad Ohří", address: "Schirnding – Pomezí nad Ohří", city: "Schirnding", country: "DE/CZ", lat: 50.086583, lng: 12.254278 },
  { display: "🌍 Waldsassen – Cheb", address: "Waldsassen – Cheb", city: "Waldsassen", country: "DE/CZ", lat: 50.039639, lng: 12.338111 },
  { display: "🌍 Waidhaus – Rozvadov", address: "Waidhaus – Rozvadov", city: "Waidhaus", country: "DE/CZ", lat: 49.642528, lng: 12.522000 },
  { display: "🌍 Furth im Wald – Folmava", address: "Furth im Wald – Folmava", city: "Furth im Wald", country: "DE/CZ", lat: 49.340778, lng: 12.850167 },
  { display: "🌍 Eisenstein – Železná Ruda", address: "Eisenstein – Železná Ruda", city: "Eisenstein", country: "DE/CZ", lat: 49.122806, lng: 13.204583 },
  { display: "🌍 Philippsreut – Strážný", address: "Philippsreut – Strážný", city: "Philippsreut", country: "DE/CZ", lat: 48.881028, lng: 13.704444 },
  { display: "🌍 Passau – Suben", address: "Passau – Suben", city: "Passau", country: "DE/AT", lat: 48.411000, lng: 13.425472 },
  { display: "🌍 Kirchdorf am Inn – Braunau", address: "Kirchdorf am Inn – Braunau", city: "Kirchdorf am Inn", country: "DE/AT", lat: 48.249639, lng: 13.009556 },
  { display: "🌍 Bad Reichenhall – Salzburg", address: "Bad Reichenhall – Salzburg", city: "Bad Reichenhall", country: "DE/AT", lat: 47.768361, lng: 12.943306 },
  { display: "🌍 Schellenberger Forst – Hallein", address: "Schellenberger Forst – Hallein", city: "Schellenberger Forst", country: "DE/AT", lat: 47.714056, lng: 13.043000 },
  { display: "🌍 Kiefersfelden – Kufstein", address: "Kiefersfelden – Kufstein", city: "Kiefersfelden", country: "DE/AT", lat: 47.605000, lng: 12.193444 },
  { display: "🌍 Füssen – Vils", address: "Füssen – Vils", city: "Füssen", country: "DE/AT", lat: 47.559278, lng: 10.656806 },
  { display: "🌍 Hörbranz – Lindau", address: "Hörbranz – Lindau", city: "Lindau", country: "DE/AT", lat: 47.547250, lng: 9.735833 },
  { display: "🌍 Konstanz – Kreuzlingen", address: "Konstanz – Kreuzlingen", city: "Konstanz", country: "DE/CH", lat: 47.661778, lng: 9.161194 },
  { display: "🌍 Bietingen – Thayngen", address: "Bietingen – Thayngen", city: "Bietingen", country: "DE/CH", lat: 47.740556, lng: 8.719222 },
  { display: "🌍 Weil am Rhein – Basel", address: "Weil am Rhein – Basel", city: "Weil am Rhein", country: "DE/CH", lat: 47.586111, lng: 7.602028 },
  { display: "🌍 Kehl – Straatsburg", address: "Kehl – Straatsburg", city: "Kehl", country: "DE/FR", lat: 48.573806, lng: 7.801889 },
  { display: "🌍 Scheibenhard – Scheibenhardt", address: "Scheibenhard – Scheibenhardt", city: "Scheibenhard", country: "DE/FR", lat: 48.978444, lng: 8.157333 },
  { display: "🌍 Saarbrücken – Forbach", address: "Saarbrücken – Forbach", city: "Saarbrücken", country: "DE/FR", lat: 49.203750, lng: 6.957917 },
  { display: "🌍 Überherrn – Creutzwald", address: "Überherrn – Creutzwald", city: "Überherrn", country: "DE/FR", lat: 49.221167, lng: 6.719361 },
  { display: "🌍 Perl – Schengen", address: "Perl – Schengen", city: "Perl", country: "DE/LU", lat: 49.479167, lng: 6.367222 },
  { display: "🌍 Mesenich – Mertert", address: "Mesenich – Mertert", city: "Mesenich", country: "DE/LU", lat: 49.733139, lng: 6.501917 },
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
        <label className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">{label}</label>
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
      <p className="text-[10px] text-brass-deep/80 mt-1 min-h-[14px]">
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
              <li className="px-4 py-3 text-sm text-brass-deep/80">Grensovergangen laden uit OpenStreetMap…</li>
            )}
            {!bordersBusy && filteredBorders.length === 0 && allBorders.length > 0 && (
              <li className="px-4 py-3 text-sm text-brass-deep/80">Geen resultaten voor "{borderFilter}"</li>
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
              <li className="px-4 py-2 text-[10px] text-brass-deep/80 italic">+{filteredBorders.length - 200} meer — verfijn de zoekterm</li>
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
              <li className="px-4 py-1.5 text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold bg-parchment/60">
                Adressen (Google)
              </li>
              {results.map((r) => (
                <li
                  key={r.place_id}
                  onClick={() => pickPrediction(r)}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-parchment border-b border-brass-deep/10 last:border-0"
                >
                  <div className="font-medium">{r.main}</div>
                  {r.secondary && <div className="text-xs text-brass-deep/80">{r.secondary}</div>}
                </li>
              ))}
            </>
          )}
        </ul>
      )}
    </div>
  );
};
