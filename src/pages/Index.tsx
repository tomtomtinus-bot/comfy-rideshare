import { Link, Navigate } from "react-router-dom";
import { Nav } from "@/components/site/Nav";
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
  "Ritplaatsing binnen 30 seconden",
  "Geautomatiseerde facturatie & btw",
  "Centraal pool- en teambeheer",
  "Realtime status en tracking",
];

const escortFeatures = [
  "Direct ritten claimen",
  "Digitale urenregistratie",
  "Google Agenda synchronisatie",
  "100% gratis voor begeleiders",
];

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SeoHead
        title="ViaCust | Digitaal dispatchplatform voor uitzonderlijk vervoer"
        description="Het alles-in-één dispatchplatform voor planners en begeleiders van uitzonderlijk vervoer. Automatiseer ritten, planningen en vergunningen in heel Europa."
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
            Het digitale platform voor uitzonderlijk vervoer
          </h1>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            ViaCust verbindt opdrachtgevers en transportbegeleiders naadloos met elkaar. Efficiënt, transparant en zero-trust beveiligd.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start als Opdrachtgever</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Aanmelden als Begeleider</Link>
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link to="/wat-kost-viacust" className="underline underline-offset-4 hover:text-foreground transition-colors">Wat kost ViaCust</Link>
            <span className="text-border">·</span>
            <Link to="/hoe-werkt-viacust" className="underline underline-offset-4 hover:text-foreground transition-colors">Hoe werkt het</Link>
          </div>
        </section>

        {/* Product preview */}
        <section className="max-w-5xl mx-auto px-5 md:px-8 pb-8 md:pb-10">
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
                  <TableRow>
                    <TableHead>Ritnummer</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead className="hidden sm:table-cell">Datum</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRides.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs md:text-sm">{r.id}</TableCell>
                      <TableCell className="text-sm">{r.route}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{r.date}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs ${r.tone}`}>
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
            <p className="mt-2 text-muted-foreground">Gebouwd voor planners én begeleiders.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Voor opdrachtgevers</CardTitle>
                <CardDescription>Plan, dispatch en factureer in één flow.</CardDescription>
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
                  <Link to="/auth">Start als opdrachtgever</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Voor begeleiders</CardTitle>
                <CardDescription>Vind ritten, registreer uren, gratis te gebruiken.</CardDescription>
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
                  <Link to="/auth">Start als begeleider</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Direct op de hoogte van de regelgeving?{" "}
            <Link to="/info/nederland" className="underline underline-offset-4 hover:text-foreground transition-colors">
              Bekijk de transportrichtlijnen voor Nederland
            </Link>{" "}en{" "}
            <Link to="/info/belgie" className="underline underline-offset-4 hover:text-foreground transition-colors">
              België
            </Link>.
          </p>
        </section>
      </main>

      {/* Slim footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-8 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-6 md:gap-12 mb-6">
            <div>
              <p className="font-semibold text-foreground mb-2">Informatie</p>
              <ul className="space-y-1.5">
                <li><Link to="/hoe-werkt-viacust" className="hover:text-foreground transition-colors">Hoe werkt het</Link></li>
                <li><Link to="/wat-kost-viacust" className="hover:text-foreground transition-colors">Tarieven</Link></li>
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link to="/info/nederland" className="hover:text-foreground transition-colors">NL Richtlijnen</Link></li>
                <li><Link to="/info/belgie" className="hover:text-foreground transition-colors">BE Richtlijnen</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-2">Juridisch</p>
              <ul className="space-y-1.5">
                <li><Link to="/voorwaarden" className="hover:text-foreground transition-colors">Algemene voorwaarden</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacyverklaring</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t flex flex-col md:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} ViaCust. Alle rechten voorbehouden.</p>
            <a href="mailto:info@viacust.com" className="hover:text-foreground transition-colors">info@viacust.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
