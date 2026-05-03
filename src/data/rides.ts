export type RideStatus = "available" | "reserved";

export interface Ride {
  id: string;
  date: string;
  time: string;
  from: string;
  to: string;
  cargo: string; // e.g. "32m × 4,2m × 4,8m · 78t"
  category: string; // cat-1 / cat-2 / cat-3
  escortType: string; // vooroprijden / achteroprijden ...
  escortInitials: string; // anoniem ID
  status: RideStatus;
  note: string;
}

export const rides: Ride[] = [
  {
    id: "r-001",
    date: "14 okt",
    time: "02:30",
    from: "Rotterdam Maasvlakte",
    to: "Duisburg Hafen (DE)",
    cargo: "38m × 5,2m × 4,9m · 110t",
    category: "Cat 3",
    escortType: "Voorop + achterop",
    escortInitials: "A1042",
    status: "available",
    note: "Nachtrit, transformator. Vergunning RDW XV-2026-0421.",
  },
  {
    id: "r-002",
    date: "14 okt",
    time: "22:00",
    from: "Antwerpen Linkeroever",
    to: "Eindhoven Acht",
    cargo: "28m × 4,5m × 4,4m · 62t",
    category: "Cat 2",
    escortType: "Vooroprijden",
    escortInitials: "A2188",
    status: "reserved",
    note: "Windturbinemast. Tijdvenster 22:00–05:00.",
  },
  {
    id: "r-003",
    date: "15 okt",
    time: "01:15",
    from: "Vlissingen Sloehaven",
    to: "Bremen (DE)",
    cargo: "45m × 3,8m × 4,2m · 84t",
    category: "Cat 3",
    escortType: "Voorop + achterop",
    escortInitials: "A1308",
    status: "available",
    note: "Bladenset windmolen, twee begeleiders verplicht.",
  },
  {
    id: "r-004",
    date: "16 okt",
    time: "23:45",
    from: "Amsterdam Westhaven",
    to: "Utrecht Lage Weide",
    cargo: "22m × 4,0m × 4,3m · 48t",
    category: "Cat 2",
    escortType: "Vooroprijden",
    escortInitials: "A2741",
    status: "available",
    note: "Prefab brugligger. Kruispuntbegeleiding gewenst.",
  },
  {
    id: "r-005",
    date: "17 okt",
    time: "03:00",
    from: "Den Haag Binckhorst",
    to: "Maasvlakte 2",
    cargo: "18m × 5,8m × 3,9m · 35t",
    category: "Cat 2",
    escortType: "Vooroprijden",
    escortInitials: "A1955",
    status: "reserved",
    note: "Booreiland-onderdeel, breedtetransport.",
  },
  {
    id: "r-006",
    date: "18 okt",
    time: "00:30",
    from: "Tilburg Vossenberg",
    to: "Luik (BE)",
    cargo: "30m × 4,2m × 4,6m · 70t",
    category: "Cat 3",
    escortType: "Voorop + achterop",
    escortInitials: "A1607",
    status: "available",
    note: "Industriële ketel. Politiebegeleiding bij grens.",
  },
];
