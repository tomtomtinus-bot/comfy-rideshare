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
      />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
            Het digitale platform voor uitzonderlijk vervoer
          </h1>
          <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            ViaCust verbindt opdrachtgevers en transportbegeleiders naadloos met elkaar. Efficiënt, transparant en zero-trust beveiligd.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Aanmelden</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/hoe-werkt-viacust">Hoe werkt het</Link>
            </Button>
          </div>
        </section>

        {/* Product preview */}
        <section className="max-w-5xl mx-auto px-5 md:px-8 pb-12 md:pb-20">
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
        </section>
      </main>

      {/* Slim footer */}
      <footer className="border-t">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} ViaCust. Alle rechten voorbehouden.</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/hoe-werkt-viacust" className="hover:text-foreground transition-colors">Hoe werkt het</Link>
            <Link to="/wat-kost-viacust" className="hover:text-foreground transition-colors">Prijzen</Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <a href="mailto:info@viacust.com" className="hover:text-foreground transition-colors">info@viacust.com</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
