export interface Surcharge {
  label: string;
  amount: string;
}

export interface Verification {
  label: string;
  verified: boolean;
}

export interface PilotVehicle {
  type: string;
  heightPole: boolean;
  lightbar: boolean;
  konvooiSign: boolean;
}

export interface Escort {
  id: string;
  anonymousId: string; // bv. A1042 — toont we ipv naam
  city: string;
  country: string;
  yearsActive: number;
  hourlyRate: number;
  currency: string;
  countries: string[];
  categories: string[]; // Cat 1 / Cat 2 / Cat 3
  escortTypes: string[]; // vooroprijden / achteroprijden / ...
  pilotVehicle: PilotVehicle;
  bio: string;
  surcharges: Surcharge[];
  verifications: Verification[];
  rating: number;
  ridesCompleted: number;
}

export const escorts: Escort[] = [
  {
    id: "a1042",
    anonymousId: "A1042",
    city: "Rotterdam",
    country: "Nederland",
    yearsActive: 12,
    hourlyRate: 58,
    currency: "EUR",
    countries: ["Nederland", "België", "Duitsland"],
    categories: ["Cat 1", "Cat 2", "Cat 3"],
    escortTypes: ["Vooroprijden", "Achteroprijden", "Kruispuntbegeleiding"],
    pilotVehicle: {
      type: "VW Crafter geel · zwaailichtbalk",
      heightPole: true,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Twaalf jaar ervaring met haventransporten en cat 3-konvooien. Specialiteit: nachtelijke routes Rotterdam–Ruhrgebied.",
    surcharges: [
      { label: "Nachtrit (22:00–06:00)", amount: "+€10/uur" },
      { label: "Weekend & feestdag", amount: "+€15/uur" },
      { label: "Grensoverschrijdend (DE/BE)", amount: "+€35 vast" },
    ],
    verifications: [
      { label: "Verkeersregelaar uitzonderlijk vervoer", verified: true },
      { label: "VCA-VOL", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig RDW-keuring", verified: true },
    ],
    rating: 4.9,
    ridesCompleted: 412,
  },
  {
    id: "a2188",
    anonymousId: "A2188",
    city: "Antwerpen",
    country: "België",
    yearsActive: 7,
    hourlyRate: 52,
    currency: "EUR",
    countries: ["België", "Nederland", "Frankrijk", "Luxemburg"],
    categories: ["Cat 1", "Cat 2"],
    escortTypes: ["Vooroprijden", "Kruispuntbegeleiding"],
    pilotVehicle: {
      type: "Mercedes Vito · zwaailichtbalk + LED-pijl",
      heightPole: true,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Gespecialiseerd in stedelijke routes en windturbinetransport in de Benelux.",
    surcharges: [
      { label: "Vroege start (voor 05:00)", amount: "+€8/uur" },
      { label: "Wachten >30 min", amount: "+€15 vast" },
    ],
    verifications: [
      { label: "Begeleider uitzonderlijk vervoer (BE)", verified: true },
      { label: "VCA-Basis", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig keuring", verified: true },
    ],
    rating: 4.8,
    ridesCompleted: 287,
  },
  {
    id: "a1308",
    anonymousId: "A1308",
    city: "Eindhoven",
    country: "Nederland",
    yearsActive: 5,
    hourlyRate: 48,
    currency: "EUR",
    countries: ["Nederland", "België", "Duitsland"],
    categories: ["Cat 1", "Cat 2"],
    escortTypes: ["Vooroprijden", "Achteroprijden"],
    pilotVehicle: {
      type: "Ford Transit · zwaailichtbalk",
      heightPole: true,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Oud-vrachtwagenchauffeur. Goed in lange grensoverschrijdende routes.",
    surcharges: [
      { label: "Nachtrit", amount: "+€12/uur" },
      { label: "Spoedopdracht <24u", amount: "+€20 vast" },
    ],
    verifications: [
      { label: "Verkeersregelaar uitzonderlijk vervoer", verified: true },
      { label: "VCA-VOL", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig RDW-keuring", verified: false },
    ],
    rating: 4.7,
    ridesCompleted: 156,
  },
  {
    id: "a2741",
    anonymousId: "A2741",
    city: "Utrecht",
    country: "Nederland",
    yearsActive: 9,
    hourlyRate: 60,
    currency: "EUR",
    countries: ["Nederland", "België", "Duitsland", "Frankrijk"],
    categories: ["Cat 1", "Cat 2", "Cat 3"],
    escortTypes: ["Vooroprijden", "Achteroprijden", "Kruispuntbegeleiding", "Politie-coördinatie"],
    pilotVehicle: {
      type: "Iveco Daily · dubbele zwaailichtbalk",
      heightPole: true,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Cat 3-specialist. Coördineert regelmatig met politie en wegbeheerders bij brugopeningen.",
    surcharges: [
      { label: "Politiecoördinatie", amount: "+€25 vast" },
      { label: "Weekend", amount: "+€12/uur" },
    ],
    verifications: [
      { label: "Verkeersregelaar uitzonderlijk vervoer", verified: true },
      { label: "VCA-VOL", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig RDW-keuring", verified: true },
    ],
    rating: 5.0,
    ridesCompleted: 341,
  },
  {
    id: "a1955",
    anonymousId: "A1955",
    city: "Den Haag",
    country: "Nederland",
    yearsActive: 15,
    hourlyRate: 55,
    currency: "EUR",
    countries: ["Nederland"],
    categories: ["Cat 1", "Cat 2"],
    escortTypes: ["Vooroprijden", "Achteroprijden"],
    pilotVehicle: {
      type: "Renault Master · zwaailichtbalk",
      heightPole: true,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Vijftien jaar in de bouwlogistiek. Veel ervaring met prefab brugligger-transport.",
    surcharges: [
      { label: "Bouwlocatie-begeleiding", amount: "Inbegrepen" },
      { label: "Feestdag", amount: "+€18/uur" },
    ],
    verifications: [
      { label: "Verkeersregelaar uitzonderlijk vervoer", verified: true },
      { label: "VCA-VOL", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig RDW-keuring", verified: true },
    ],
    rating: 4.9,
    ridesCompleted: 528,
  },
  {
    id: "a1607",
    anonymousId: "A1607",
    city: "Tilburg",
    country: "Nederland",
    yearsActive: 4,
    hourlyRate: 46,
    currency: "EUR",
    countries: ["Nederland", "België"],
    categories: ["Cat 1", "Cat 2"],
    escortTypes: ["Vooroprijden"],
    pilotVehicle: {
      type: "VW Transporter · zwaailichtbalk",
      heightPole: false,
      lightbar: true,
      konvooiSign: true,
    },
    bio: "Jonge begeleider met focus op planmatige industriële transporten in Zuid-NL en Vlaanderen.",
    surcharges: [
      { label: "Avondrit (na 19:00)", amount: "+€8/uur" },
    ],
    verifications: [
      { label: "Verkeersregelaar uitzonderlijk vervoer", verified: true },
      { label: "VCA-Basis", verified: true },
      { label: "Aansprakelijkheidsverzekering", verified: true },
      { label: "Pilotvoertuig RDW-keuring", verified: false },
    ],
    rating: 4.6,
    ridesCompleted: 92,
  },
];
