export interface Surcharge {
  label: string;
  amount: string;
}

export interface Verification {
  label: string;
  verified: boolean;
}

export interface Escort {
  id: string;
  name: string;
  initials: string;
  city: string;
  country: string;
  yearsActive: number;
  hourlyRate: number;
  currency: string;
  countries: string[];
  languages: string[];
  bio: string;
  surcharges: Surcharge[];
  verifications: Verification[];
  rating: number;
  ridesCompleted: number;
}

export const escorts: Escort[] = [
  {
    id: "hendrik-van-der-meer",
    name: "Hendrik van der Meer",
    initials: "HM",
    city: "Utrecht",
    country: "Nederland",
    yearsActive: 12,
    hourlyRate: 38,
    currency: "EUR",
    countries: ["Nederland", "België", "Duitsland"],
    languages: ["Nederlands", "Engels", "Duits"],
    bio: "Voormalig verpleegkundige met ruime ervaring in medische begeleiding. Rustig, geduldig en discreet.",
    surcharges: [
      { label: "Avondrit (na 20:00)", amount: "+€8/uur" },
      { label: "Weekend & feestdag", amount: "+€12/uur" },
      { label: "Grensoverschrijdend", amount: "+€25 vast" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "VOG verklaring", verified: true },
      { label: "EHBO certificaat", verified: true },
      { label: "Rijbewijs B (12+ jaar)", verified: true },
    ],
    rating: 4.9,
    ridesCompleted: 412,
  },
  {
    id: "elena-martens",
    name: "Elena Martens",
    initials: "EM",
    city: "Antwerpen",
    country: "België",
    yearsActive: 7,
    hourlyRate: 34,
    currency: "EUR",
    countries: ["België", "Nederland", "Frankrijk", "Luxemburg"],
    languages: ["Nederlands", "Frans", "Engels"],
    bio: "Gespecialiseerd in stedelijke verplaatsingen en persoonlijke ondersteuning bij administratieve afspraken.",
    surcharges: [
      { label: "Vroege ochtend (voor 07:00)", amount: "+€6/uur" },
      { label: "Wachten >30 min", amount: "+€10 vast" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "Uittreksel strafregister", verified: true },
      { label: "EHBO certificaat", verified: true },
      { label: "Rijbewijs B (7+ jaar)", verified: true },
    ],
    rating: 4.8,
    ridesCompleted: 287,
  },
  {
    id: "sander-de-groot",
    name: "Sander de Groot",
    initials: "SG",
    city: "Rotterdam",
    country: "Nederland",
    yearsActive: 5,
    hourlyRate: 32,
    currency: "EUR",
    countries: ["Nederland", "België"],
    languages: ["Nederlands", "Engels"],
    bio: "Sportieve begeleider, goed in lange ritten en meertraps reizen. Houdt van een rustig gesprek onderweg.",
    surcharges: [
      { label: "Nachtrit (na 22:00)", amount: "+€10/uur" },
      { label: "Bagage >2 stuks", amount: "+€5 vast" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "VOG verklaring", verified: true },
      { label: "EHBO certificaat", verified: false },
      { label: "Rijbewijs B (5+ jaar)", verified: true },
    ],
    rating: 4.7,
    ridesCompleted: 156,
  },
  {
    id: "beatrice-solms",
    name: "Beatrice Solms",
    initials: "BS",
    city: "Den Haag",
    country: "Nederland",
    yearsActive: 9,
    hourlyRate: 40,
    currency: "EUR",
    countries: ["Nederland", "België", "Duitsland", "Frankrijk"],
    languages: ["Nederlands", "Duits", "Frans", "Engels"],
    bio: "Voormalig sociaal werker. Gespecialiseerd in begeleiding bij ziekenhuisbezoeken en intakegesprekken.",
    surcharges: [
      { label: "Begeleiding bij intake", amount: "+€15 vast" },
      { label: "Weekend", amount: "+€10/uur" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "VOG verklaring", verified: true },
      { label: "EHBO certificaat", verified: true },
      { label: "Diploma sociaal werk", verified: true },
    ],
    rating: 5.0,
    ridesCompleted: 341,
  },
  {
    id: "willem-de-boer",
    name: "Willem de Boer",
    initials: "WB",
    city: "Haarlem",
    country: "Nederland",
    yearsActive: 15,
    hourlyRate: 36,
    currency: "EUR",
    countries: ["Nederland"],
    languages: ["Nederlands", "Engels"],
    bio: "Vriendelijke en ervaren begeleider voor recreatieve uitstapjes. Houdt van kustritten en korte stops.",
    surcharges: [
      { label: "Recreatieve stops", amount: "Inbegrepen" },
      { label: "Feestdag", amount: "+€15/uur" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "VOG verklaring", verified: true },
      { label: "EHBO certificaat", verified: true },
      { label: "Rijbewijs B (15+ jaar)", verified: true },
    ],
    rating: 4.9,
    ridesCompleted: 528,
  },
  {
    id: "martha-van-den-berg",
    name: "Martha van den Berg",
    initials: "MB",
    city: "Breda",
    country: "Nederland",
    yearsActive: 4,
    hourlyRate: 30,
    currency: "EUR",
    countries: ["Nederland", "België"],
    languages: ["Nederlands", "Engels", "Spaans"],
    bio: "Geduldige begeleider met affiniteit voor studenten en jongvolwassenen. Goed in plannen en logistiek.",
    surcharges: [
      { label: "Avondrit (na 19:00)", amount: "+€7/uur" },
    ],
    verifications: [
      { label: "Identiteit geverifieerd", verified: true },
      { label: "VOG verklaring", verified: true },
      { label: "EHBO certificaat", verified: false },
      { label: "Rijbewijs B (4+ jaar)", verified: true },
    ],
    rating: 4.6,
    ridesCompleted: 92,
  },
];
