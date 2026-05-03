export type RideStatus = "available" | "reserved";

export interface Ride {
  id: string;
  date: string;
  time: string;
  from: string;
  to: string;
  escortName: string;
  escortInitials: string;
  status: RideStatus;
  note: string;
}

export const rides: Ride[] = [
  {
    id: "r-001",
    date: "14 okt",
    time: "08:45",
    from: "Utrecht MC",
    to: "Groningen Centrum",
    escortName: "Hendrik van der Meer",
    escortInitials: "HM",
    status: "available",
    note: "Begeleiding bij medische afspraak, rolstoel-vriendelijk vervoer.",
  },
  {
    id: "r-002",
    date: "14 okt",
    time: "13:20",
    from: "Antwerpen Haven",
    to: "Brussel Noord",
    escortName: "Elena Martens",
    escortInitials: "EM",
    status: "reserved",
    note: "Stadsverplaatsing met persoonlijke ondersteuning.",
  },
  {
    id: "r-003",
    date: "15 okt",
    time: "07:00",
    from: "Rotterdam Haven",
    to: "Eindhoven Tech",
    escortName: "Sander de Groot",
    escortInitials: "SG",
    status: "available",
    note: "Vroege ochtendrit, koffie onderweg inbegrepen.",
  },
  {
    id: "r-004",
    date: "16 okt",
    time: "10:15",
    from: "Den Haag CS",
    to: "Amsterdam VU",
    escortName: "Beatrice Solms",
    escortInitials: "BS",
    status: "available",
    note: "Ziekenhuisbezoek met begeleiding bij intake.",
  },
  {
    id: "r-005",
    date: "17 okt",
    time: "14:00",
    from: "Haarlem Noord",
    to: "Zandvoort aan Zee",
    escortName: "Willem de Boer",
    escortInitials: "WB",
    status: "reserved",
    note: "Recreatieve rit, kustbezoek met rustpauzes.",
  },
  {
    id: "r-006",
    date: "18 okt",
    time: "09:30",
    from: "Breda Centrum",
    to: "Tilburg Universiteit",
    escortName: "Martha van den Berg",
    escortInitials: "MB",
    status: "available",
    note: "Begeleiding bij studieafspraak, geduldige aanpak.",
  },
];
