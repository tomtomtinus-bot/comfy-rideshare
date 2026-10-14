import { Link, Navigate } from "react-router-dom";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { SeoHead } from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockRides = [
  { id: "VC2601-0421", route: "Rotterdam → Antwerpen", date: "12 jun", status: "Toegewezen", tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { id: "VC2601-0422", route: "Eindhoven → Düsseldorf", date: "12 jun", status: "Open", tone: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { id: "VC2601-0423", route: "Utrecht → Hamburg", date: "13 jun", status: "Onderweg", tone: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
  { id: "VC2601-0424", route: "Gent → Lille", date: "13 jun", status: "Afgerond", tone: "bg-muted text-muted-foreground border-border" },
];

const clientFeatures = [
  "Plan en wijs direct toe aan je eigen vaste begeleiders.",
  "Realtime ritstatussen (nooit meer bellen: \u201cwaar ben je?\u201d).",
  "Digitale ritbonnen centraal controleren en accorderen.",
  "1-klik export voor je boekhoudpakket.",
];

const escortFeatures = [
  "Ontvang ritten direct in je eigen Google Agenda.",
  "Tarieven, uren en kilometers automatisch berekend.",
  "Dien digitale ritbonnen direct in na aankomst.",
  "Automatische facturatie naar je opdrachtgevers\n",
];

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead
        title="ViaCust | Plannings- en administratietool voor uitzonderlijk vervoer"
        description="Plan ritten met je vaste netwerk van transportbegeleiders, volg statussen realtime en automatiseer ritbonnen en facturatie in één centraal dashboard."
        canonical="https://viacust.com/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ViaCust",
            url: "https://viacust.com/",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ViaCust",
            url: "https://viacust.com",
            logo: "https://viacust.com/og-image-v5.jpg",
            contactPoint: {
              "@type": "ContactPoint",
              email: "info@viacust.com",
              contactType: "customer service",
            },
          },
        ]}
      />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-5 md:px-8 pt-8 md:pt-12 pb-6 md:pb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Dé plannings- en administratietool voor uitzonderlijk vervoer
          </h1>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Weg met WhatsApp-chaos en handgeschreven ritbonnen. Plan ritten met je vaste netwerk, volg statussen realtime en automatiseer de facturatie in één centraal dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start als Planner / Transporteur</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Start als Begeleider</Link>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/wat-kost-viacust" className="underline underline-offset-4 hover:text-foreground transition-colors">Wat kost ViaCust</Link>
            <span className="text-border">·</span>
            <Link to="/hoe-werkt-viacust" className="underline underline-offset-4 hover:text-foreground transition-colors">Hoe werkt het</Link>
          </div>
        </section>

        {/* Product preview */}
        <section aria-labelledby="product-preview-heading" className="max-w-5xl mx-auto px-5 md:px-8 pb-8 md:pb-10">
          <h2 id="product-preview-heading" className="text-xl font-semibold tracking-tight text-foreground mt-8 mb-4">
            Live ritten in je dashboard
          </h2>
          <Card className="overflow-hidden shadow-sm">
            <CardHeader className="border-b bg-muted/30 py-3 px-4 md:px-6 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-red-400/70" />
                <div className="size-2.5 rounded-full bg-amber-400/70" />
                <div className="size-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs text-muted-foreground">app.viacust.com/dashboard</span>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">Live ritten · Vandaag</span>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-8">
                    <TableHead className="py-1.5 text-xs">Ritnummer</TableHead>
                    <TableHead className="py-1.5 text-xs">Route</TableHead>
                    <TableHead className="hidden sm:table-cell py-1.5 text-xs">Datum</TableHead>
                    <TableHead className="text-right py-1.5 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRides.map((r) => (
                    <TableRow key={r.id} className="h-9">
                      <TableCell className="py-1.5 font-mono text-xs">{r.id}</TableCell>
                      <TableCell className="py-1.5 text-xs md:text-sm">{r.route}</TableCell>
                      <TableCell className="hidden sm:table-cell py-1.5 text-xs text-muted-foreground">{r.date}</TableCell>
                      <TableCell className="text-right py-1.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-px text-[11px] leading-4 ${r.tone}`}>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Two audiences */}
        <section className="max-w-5xl mx-auto px-5 md:px-8 pb-16 md:pb-24">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Eén platform, twee perspectieven</h2>
            <p className="mt-2 text-muted-foreground">Gebouwd voor vaste samenwerking tussen planners en begeleiders.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Voor planners &amp; transporteurs</CardTitle>
                <CardDescription>Behoud het overzicht, van opdracht tot factuur.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {clientFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className="text-primary mt-0.5">&#10003;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full">
                  <Link to="/auth">Start als planner / transporteur</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Voor transportbegeleiders</CardTitle>
                <CardDescription>Nooit meer &apos;s nachts handmatig uren en bonnetjes overtikken.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {escortFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <span className="text-primary mt-0.5">&#10003;</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-6 w-full">
                  <Link to="/auth">Aanmelden als begeleider</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
