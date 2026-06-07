import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";

interface CheckItem {
  id: string;
  label: string;
}

interface Section {
  id: string;
  title: string;
  items: CheckItem[];
}

const sections: Section[] = [
  {
    id: "voertuig-lading",
    title: "1. Voertuig- en Ladingmaten",
    items: [
      { id: "v1", label: "Controleer de totale lengte van het transport (inclusief trekker en lading)" },
      { id: "v2", label: "Meet en registreer de exacte breedte van de lading" },
      { id: "v3", label: "Bepaal het totale gewicht en de asdruk per as" },
      { id: "v4", label: "Controleer of de lading over de zijkanten uitsteekt" },
      { id: "v5", label: "Documenteer de totale hoogte indien deze meer dan 4 meter bedraagt" },
    ],
  },
  {
    id: "ontheffingen",
    title: "2. Ontheffingen en RDW-vergunningen",
    items: [
      { id: "o1", label: "Vraag tijdig een RDW-ontheffing aan voor uitzonderlijk vervoer" },
      { id: "o2", label: "Controleer de geldigheid van de bestaande vergunningen" },
      { id: "o3", label: "Bepaal of een EU-ontheffing nodig is voor grensoverschrijdend transport" },
      { id: "o4", label: "Registreer het transport in het systeem van de betreffende lidstaat" },
      { id: "o5", label: "Houd kopieën van alle vergunningen beschikbaar in het voertuig" },
    ],
  },
  {
    id: "begeleiding",
    title: "3. Transportbegeleiding & Pilot Cars",
    items: [
      { id: "b1", label: "Bepaal het benodigde aantal begeleidingsvoertuigen op basis van maat en route" },
      { id: "b2", label: "Controleer of begeleiders gecertificeerd zijn voor het specifieke transport" },
      { id: "b3", label: "Plan het overlegmoment met begeleiders voor vertrek" },
      { id: "b4", label: "Regel communicatiemiddelen ( portofoon / telefoon ) voor alle betrokkenen" },
      { id: "b5", label: "Zorg dat het begeleidingsplan aanwezig is in elk begeleidingsvoertuig" },
    ],
  },
  {
    id: "route",
    title: "4. Routeverboden & Spitsuren",
    items: [
      { id: "r1", label: "Controleer actuele routeverboden en omleidingen in het gebied" },
      { id: "r2", label: "Plan het vertrek buiten spitsuren voor een soepele doorstroming" },
      { id: "r3", label: "Identificeer bruggen, tunnels en kruispunten met hoogte- of breedtebeperkingen" },
      { id: "r4", label: "Bepaal parkeer- en rustlocaties langs de route voor langere ritten" },
      { id: "r5", label: "Deel de definitieve route met chauffeur, begeleiders en opdrachtgever" },
    ],
  },
];

const ChecklistSpeciaalTransport = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Wat is speciaal transport?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Speciaal transport omvat het vervoer van ladingen die de normale wettelijke afmetingen of gewichten overschrijden. Dit vereist specifieke vergunningen, begeleiding en routeplanning.",
        },
      },
      {
        "@type": "Question",
        name: "Wanneer is een transportbegeleider verplicht?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Een transportbegeleider is verplicht bij transporten die bepaalde lengte-, breedte- of gewichtsgrenzen overschrijden. De exacte eisen verschillen per land en wegtype.",
        },
      },
      {
        "@type": "Question",
        name: "Hoe vraag ik een RDW-ontheffing aan?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Een RDW-ontheffing vraag je aan via het officiële portaal van de Rijksdienst voor het Wegverkeer. Zorg voor exacte voertuig- en ladinggegevens en dien de aanvraag minimaal enkele werkdagen voor vertrek in.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title="Checklist Speciaal Transport | ViaCust"
        description="De complete checklist voor transportplanners bij speciaal en uitzonderlijk vervoer. Controleer voertuigmaten, vergunningen, begeleiding en routeplanning."
        canonical="https://viacust.com/checklist-speciaal-transport"
        jsonLd={[faqJsonLd]}
      />
      <Nav />
      <main className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
            Checklist Speciaal Transport
          </h1>
          <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
            Gebruik deze interactieve checklist om te verifiëren dat je transport aan alle wettelijke en praktische eisen voldoet. Vink de stappen af terwijl je werkt — je voortgang wordt automatisch bijgehouden.
          </p>
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              {checkedCount} van {totalCount} afgevinkt
            </span>
            <span className="text-border">|</span>
            <span>{progress}% voltooid</span>
          </div>
        </header>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="px-5 md:px-6 py-4 border-b border-border bg-muted/40">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {section.title}
                </h2>
              </div>
              <div className="px-5 md:px-6 py-4 space-y-3">
                {section.items.map((item) => {
                  const isChecked = !!checked[item.id];
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={item.id}
                        checked={isChecked}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={item.id}
                        className={`text-sm leading-relaxed cursor-pointer ${
                          isChecked
                            ? "text-muted-foreground line-through"
                            : "text-foreground/90"
                        }`}
                      >
                        {item.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-12">
          <Card className="border border-border bg-card">
            <CardContent className="p-6 md:p-8">
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                Slimmer plannen?
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mb-6">
                Automatiseer je transportbegeleiding, urenregistratie en ritten met ViaCust. Onze enterprise-software verbindt planners en begeleiders in één krachtig platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="h-11">
                  <Link to="/auth">Meld je aan als Planner</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11">
                  <Link to="/auth">Meld je aan als Begeleider</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ChecklistSpeciaalTransport;
