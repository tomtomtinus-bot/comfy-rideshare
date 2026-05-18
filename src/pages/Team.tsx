import { useEffect, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, UserPlus, Minus, Plus, CreditCard } from "lucide-react";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { Navigate } from "react-router-dom";

interface MemberRow {
  id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  full_name?: string | null;
  email?: string | null;
}

interface InvitationRow {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TeamInner = () => {
  const { user, role } = useAuth();
  const { companyId, isPlanner, loading: companyLoading } = useCompany();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [company, setCompany] = useState<{ name: string; seat_limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [seatsOpen, setSeatsOpen] = useState(false);
  const [seatQty, setSeatQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const [c, m, inv] = await Promise.all([
      supabase.from("companies").select("name, seat_limit").eq("id", companyId).maybeSingle(),
      supabase.from("company_members").select("id, user_id, role, status, joined_at").eq("company_id", companyId).eq("status", "active"),
      supabase.from("company_invitations").select("id, email, status, created_at, expires_at").eq("company_id", companyId).eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setCompany((c.data as any) ?? null);
    const memberRows = (m.data as MemberRow[]) ?? [];
    // Profielnamen erbij halen.
    if (memberRows.length) {
      const ids = memberRows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      memberRows.forEach((r) => { r.full_name = map.get(r.user_id) ?? null; });
    }
    setMembers(memberRows);
    setInvitations((inv.data as InvitationRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [companyId]);

  if (companyLoading) {
    return <div className="min-h-screen flex items-center justify-center text-brass-deep/60">Laden…</div>;
  }
  if (role !== "begeleider" || !isPlanner) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-company-driver", {
        body: { email: inviteEmail.trim(), origin: window.location.origin },
      });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error ?? error?.message ?? "Uitnodiging mislukt");
      } else {
        toast.success(`Uitnodiging verzonden naar ${inviteEmail}`);
        setInviteEmail("");
        setInviteOpen(false);
        await load();
      }
    } finally {
      setInviting(false);
    }
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase.from("company_invitations").update({ status: "revoked" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Uitnodiging ingetrokken");
    await load();
  };

  const removeDriver = async (memberId: string, userId: string) => {
    if (userId === user?.id) { toast.error("Je kunt jezelf niet verwijderen"); return; }
    if (!confirm("Chauffeur loskoppelen van je bedrijf?")) return;
    const { error } = await supabase.from("company_members").update({ status: "removed" }).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success("Chauffeur verwijderd");
    await load();
  };

  const driverMembers = members.filter((m) => m.role === "driver");
  const seatsUsed = driverMembers.length + invitations.length;
  const seatsAvailable = (company?.seat_limit ?? 1) - 1; // -1 voor planner zelf? Nee, seat_limit telt chauffeurs.
  // Convention: seat_limit = max aantal chauffeurs (excl. planner).
  const seatsLeft = Math.max(0, seatsAvailable - seatsUsed);

  return (
    <div className="min-h-screen bg-parchment">
      <Nav />
      <main className="max-w-5xl mx-auto px-6 md:px-8 py-12">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brass-deep/50 mb-2">Bedrijfsbeheer</p>
          <h1 className="font-display text-4xl text-brass-deep mb-2">Mijn team</h1>
          <p className="text-sm text-brass-deep/70">
            Nodig chauffeurs uit om onder jouw bedrijf ritten uit te voeren. Jij blijft verantwoordelijk
            voor ritacceptatie, urengoedkeuring en facturatie.
          </p>
        </div>

        <section className="bg-white border border-brass-deep/10 p-6 mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-brass-deep/50">Bedrijf</p>
              <p className="text-xl text-brass-deep font-semibold">{company?.name ?? "—"}</p>
              <p className="text-xs text-brass-deep/60 mt-1">
                Chauffeurplaatsen gebruikt: <strong>{seatsUsed}</strong> / {seatsAvailable}
                {seatsLeft > 0 ? ` (${seatsLeft} vrij)` : " — limiet bereikt"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={seatsOpen} onOpenChange={(v) => { setSeatsOpen(v); if (v) setSeatQty(Math.max(1, seatsAvailable || 1)); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CreditCard className="size-4" /> Beheer seats
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Chauffeur-seats</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-brass-deep/70">
                      Kies hoeveel chauffeurs je onder je bedrijf wilt laten rijden. Je betaalt per actieve
                      chauffeur per maand. De Bedrijfsplanner is gratis.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <Button variant="outline" size="icon" onClick={() => setSeatQty((q) => Math.max(1, q - 1))} disabled={seatQty <= 1}>
                        <Minus className="size-4" />
                      </Button>
                      <div className="text-3xl font-display text-brass-deep w-16 text-center">{seatQty}</div>
                      <Button variant="outline" size="icon" onClick={() => setSeatQty((q) => Math.min(50, q + 1))} disabled={seatQty >= 50}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <p className="text-center text-sm text-brass-deep/70">
                      €29,00 × {seatQty} = <strong>€{(29 * seatQty).toFixed(2)}</strong> / maand · excl. BTW
                    </p>
                    {seatsUsed > seatQty && (
                      <p className="text-xs text-red-600 text-center">
                        Je hebt nu {seatsUsed} chauffeurs gekoppeld; verlagen naar {seatQty} kan pas nadat je chauffeurs hebt verwijderd.
                      </p>
                    )}
                    <Button
                      className="w-full"
                      disabled={seatsUsed > seatQty}
                      onClick={() => { setSeatsOpen(false); setCheckoutOpen(true); }}
                    >
                      Bevestig & betaal
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button disabled={seatsLeft <= 0} className="gap-2">
                    <UserPlus className="size-4" /> Chauffeur uitnodigen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Chauffeur uitnodigen</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-brass-deep/70">
                      Vul het e-mailadres in. De chauffeur ontvangt een uitnodiging om een account aan te
                      maken (of bestaande login te gebruiken).
                    </p>
                    <Input
                      type="email"
                      placeholder="chauffeur@bedrijf.nl"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      autoFocus
                    />
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full">
                      {inviting ? <><Loader2 className="size-4 animate-spin mr-2" /> Versturen…</> : "Verstuur uitnodiging"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          title={`Chauffeur-seats (${seatQty})`}
          priceId="begeleider_company_seat_monthly"
          quantity={seatQty}
          customerEmail={user?.email ?? undefined}
          userId={user?.id}
          returnUrl={`${window.location.origin}/team?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
        />

        {seatsLeft <= 0 && seatsAvailable === 0 && (
          <div className="mb-6 p-4 border border-brass-gold/40 bg-brass-gold/10 text-sm text-brass-deep">
            Je huidige abonnement bevat geen chauffeurplaatsen. Verhoog je abonnement om chauffeurs toe te voegen.
          </div>
        )}

        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-brass-deep/60 mb-3">Actieve chauffeurs</h2>
          {loading ? (
            <p className="text-sm text-brass-deep/60">Laden…</p>
          ) : driverMembers.length === 0 ? (
            <p className="text-sm text-brass-deep/60 italic">Nog geen chauffeurs gekoppeld.</p>
          ) : (
            <div className="border border-brass-deep/10 bg-white divide-y divide-brass-deep/10">
              {driverMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-brass-deep">{m.full_name || "Chauffeur"}</p>
                    <p className="text-xs text-brass-deep/55">Gekoppeld {new Date(m.joined_at).toLocaleDateString("nl-NL")}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeDriver(m.id, m.user_id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-brass-deep/60 mb-3">Openstaande uitnodigingen</h2>
          {invitations.length === 0 ? (
            <p className="text-sm text-brass-deep/60 italic">Geen openstaande uitnodigingen.</p>
          ) : (
            <div className="border border-brass-deep/10 bg-white divide-y divide-brass-deep/10">
              {invitations.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail className="size-4 text-brass-deep/50" />
                    <div>
                      <p className="text-sm font-medium text-brass-deep">{inv.email}</p>
                      <p className="text-xs text-brass-deep/55">
                        Verzonden {new Date(inv.created_at).toLocaleDateString("nl-NL")} · verloopt{" "}
                        {new Date(inv.expires_at).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => revokeInvitation(inv.id)}>
                    Intrekken
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

const Team = () => (
  <RequireAuth>
    <TeamInner />
  </RequireAuth>
);
export default Team;
