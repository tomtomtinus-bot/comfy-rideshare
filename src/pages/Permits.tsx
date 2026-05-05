import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, FileText, Trash2, MapPin } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { parsePermitPdf, type ParsedPermit } from "@/lib/permitParser";
import { PermitRouteMap } from "@/components/site/PermitRouteMap";

interface PermitRow {
  id: string;
  permit_number: string;
  reference: string | null;
  carrier: string | null;
  cargo: string | null;
  valid_from: string | null;
  valid_to: string | null;
  max_length_m: number | null;
  max_width_m: number | null;
  max_height_m: number | null;
  max_weight_kg: number | null;
  pdf_path: string | null;
  created_at: string;
}

interface RouteRow {
  id: string;
  permit_id: string;
  route_index: number;
  loaded: boolean;
  origin: string;
  destination: string;
  waypoints: any;
}

export default function Permits() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [permits, setPermits] = useState<PermitRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(params.get("id"));

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = window.location.pathname + window.location.search;
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const { data: p } = await supabase.from("permits").select("*").order("created_at", { ascending: false });
    setPermits((p ?? []) as PermitRow[]);
    const { data: r } = await supabase.from("permit_routes").select("*").order("route_index");
    setRoutes((r ?? []) as RouteRow[]);
    if (!selected && p && p.length) setSelected(p[0].id);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      toast.info("Ontheffing wordt uitgelezen…");
      const parsed: ParsedPermit = await parsePermitPdf(file);
      if (!parsed.permitNumber) {
        toast.error("Geen ontheffingnummer gevonden in PDF");
        return;
      }

      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^\w.\-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(-120);
      const path = `${user.id}/${Date.now()}-${safeName || "ontheffing.pdf"}`;
      const { error: upErr } = await supabase.storage.from("permits").upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: ins, error: insErr } = await supabase
        .from("permits")
        .insert({
          client_id: user.id,
          permit_number: parsed.permitNumber,
          reference: parsed.reference,
          carrier: parsed.carrier,
          cargo: parsed.cargo,
          valid_from: parsed.validFrom,
          valid_to: parsed.validTo,
          max_length_m: parsed.maxLengthM,
          max_width_m: parsed.maxWidthM,
          max_height_m: parsed.maxHeightM,
          max_weight_kg: parsed.maxWeightKg,
          pdf_path: path,
          raw_data: parsed as any,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      if (parsed.routes.length > 0) {
        const rowsToInsert = parsed.routes.map((r) => ({
          permit_id: ins.id,
          route_index: r.routeIndex,
          loaded: r.loaded,
          origin: r.origin,
          destination: r.destination,
          waypoints: r.waypoints as any,
        }));
        await supabase.from("permit_routes").insert(rowsToInsert);
      }

      toast.success(`Ontheffing ${parsed.permitNumber} opgeslagen (${parsed.routes.length} route(s))`);
      setSelected(ins.id);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Upload mislukt");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ontheffing en bijbehorende routes verwijderen?")) return;
    const p = permits.find((x) => x.id === id);
    if (p?.pdf_path) await supabase.storage.from("permits").remove([p.pdf_path]);
    await supabase.from("permits").delete().eq("id", id);
    if (selected === id) setSelected(null);
    await load();
  };

  const openPdf = async (path: string | null) => {
    if (!path) return;
    const { data } = await supabase.storage.from("permits").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const current = permits.find((p) => p.id === selected) ?? null;
  const currentRoutes = routes.filter((r) => r.permit_id === selected);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isExpired = (p: PermitRow) => p.valid_to ? new Date(p.valid_to) < today : false;
  const activePermits = permits.filter((p) => !isExpired(p));
  const expiredPermits = permits.filter((p) => isExpired(p));

  const renderPermitButton = (p: PermitRow) => (
    <button
      key={p.id}
      onClick={() => setSelected(p.id)}
      className={`w-full text-left rounded-md border p-3 transition-colors ${
        selected === p.id ? "bg-accent border-primary" : "hover:bg-accent"
      }`}
    >
      <div className="font-mono text-sm font-semibold">{p.permit_number}</div>
      <div className="text-xs text-muted-foreground truncate">
        {p.carrier ?? "—"}
      </div>
      {p.valid_to && (
        <div className="text-xs text-muted-foreground">t/m {new Date(p.valid_to).toLocaleDateString("nl-NL")}</div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 container max-w-6xl py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Ontheffingen</h1>
            <p className="text-muted-foreground">Beheer je RDW-ontheffingen.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Ontheffing uploaden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Input
                type="file"
                accept="application/pdf"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
                className="max-w-sm"
              />
              {uploading && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Uitlezen…
                </span>
              )}
            </div>
            <Alert className="mt-4">
              <AlertDescription className="text-xs">
                Upload de RDW-ontheffing als PDF. We lezen automatisch het ontheffingnummer, de geldigheid en afmetingen uit.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Mijn ontheffingen</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="active">
                <TabsList className="w-full">
                  <TabsTrigger value="active" className="flex-1">Actief ({activePermits.length})</TabsTrigger>
                  <TabsTrigger value="expired" className="flex-1">Verlopen ({expiredPermits.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="space-y-2 mt-3">
                  {activePermits.length === 0 && (
                    <p className="text-sm text-muted-foreground">Geen actieve ontheffingen.</p>
                  )}
                  {activePermits.map(renderPermitButton)}
                </TabsContent>
                <TabsContent value="expired" className="space-y-2 mt-3">
                  {expiredPermits.length === 0 && (
                    <p className="text-sm text-muted-foreground">Geen verlopen ontheffingen.</p>
                  )}
                  {expiredPermits.map(renderPermitButton)}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {current ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="font-mono">{current.permit_number}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{current.carrier} · {current.cargo}</p>
                  </div>
                  <div className="flex gap-2">
                    {current.pdf_path && (
                      <Button size="sm" variant="outline" onClick={() => openPdf(current.pdf_path)}>
                        <FileText className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(current.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Stat label="Geldig vanaf" value={current.valid_from ? new Date(current.valid_from).toLocaleDateString("nl-NL") : "—"} />
                  <Stat label="Geldig t/m" value={current.valid_to ? new Date(current.valid_to).toLocaleDateString("nl-NL") : "—"} />
                  <Stat label="Lengte" value={current.max_length_m ? `${current.max_length_m} m` : "—"} />
                  <Stat label="Breedte" value={current.max_width_m ? `${current.max_width_m} m` : "—"} />
                  <Stat label="Hoogte" value={current.max_height_m ? `${current.max_height_m} m` : "—"} />
                  <Stat label="Massa" value={current.max_weight_kg ? `${(current.max_weight_kg / 1000).toLocaleString("nl-NL")} t` : "—"} />
                  <Stat label="Referentie" value={current.reference ?? "—"} />
                  <Stat label="Routes" value={String(currentRoutes.length)} />
                </div>

                {currentRoutes.length > 0 ? (
                  <Tabs defaultValue={`r-${currentRoutes[0].route_index}`}>
                    <TabsList className="flex-wrap h-auto">
                      {currentRoutes.map((r) => (
                        <TabsTrigger key={r.id} value={`r-${r.route_index}`}>
                          Route {r.route_index} {r.loaded ? "(beladen)" : "(onbeladen)"}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {currentRoutes.map((r) => (
                      <TabsContent key={r.id} value={`r-${r.route_index}`} className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="secondary">{r.origin}</Badge>
                          <span>→</span>
                          <Badge variant="secondary">{r.destination}</Badge>
                          <Badge variant={r.loaded ? "default" : "outline"}>
                            {r.loaded ? "Beladen" : "Onbeladen"}
                          </Badge>
                        </div>

                        <PermitRouteMap origin={r.origin} destination={r.destination} waypoints={(r.waypoints as any) ?? []} />
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="text-sm text-muted-foreground">Geen routes uit PDF gehaald.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecteer een ontheffing of upload er een nieuwe.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
