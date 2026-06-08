import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Nav } from "@/components/site/Nav";
import { SeoHead } from "@/components/SeoHead";
import { Footer } from "@/components/site/Footer";
import { RequireAuth } from "@/components/site/RequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, UserPlus, Minus, Plus, CreditCard, MoreHorizontal } from "lucide-react";
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

const fmtDate = (d: string) => {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const TeamInner = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith("fr") ? "fr-BE" : i18n.language?.startsWith("de") ? "de-DE" : i18n.language?.startsWith("en") ? "en-GB" : "nl-NL";
  const { user, role } = useAuth();
  const { companyId, isPlanner, isBusinessEscort, loading: companyLoading } = useCompany();
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
  const [search, setSearch] = useState("");

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
    if (memberRows.length) {
      const ids = memberRows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      const emailMap = new Map((profs ?? []).map((p: any) => [p.id, p.email]));
      memberRows.forEach((r) => {
        r.full_name = nameMap.get(r.user_id) ?? null;
        r.email = emailMap.get(r.user_id) ?? null;
      });
    }
    setMembers(memberRows);
    setInvitations((inv.data as InvitationRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [companyId]);

  if (companyLoading) {
    return <div className="min-h-screen flex items-center justify-center text-brass-deep/80">{t("common.loading", { defaultValue: "Laden…" })}</div>;
  }
  if (role !== "begeleider" || !isBusinessEscort) {
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
        toast.error((data as any)?.error ?? error?.message ?? t("team.inviteFailed"));
      } else {
        toast.success(t("team.inviteSent", { email: inviteEmail }));
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
    toast.success(t("team.revoked"));
    await load();
  };

  const removeDriver = async (memberId: string, userId: string) => {
    if (userId === user?.id) { toast.error(t("team.cannotRemoveSelf")); return; }
    if (!confirm(t("team.confirmRemove"))) return;
    const { error } = await supabase.from("company_members").update({ status: "removed" }).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(t("team.removed"));
    await load();
  };

  const driverMembers = members.filter((m) => m.role === "driver");
  const seatsUsed = driverMembers.length + invitations.length;
  const seatsAvailable = (company?.seat_limit ?? 1) - 1;
  const seatsLeft = Math.max(0, seatsAvailable - seatsUsed);

  const filteredDrivers = driverMembers.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (m.full_name ?? "").toLowerCase().includes(q) ||
      (m.email ?? "").toLowerCase().includes(q)
    );
  });

  const filteredInvites = invitations.filter((inv) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return inv.email.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-parchment">
      <SeoHead title="Team | ViaCust" description="Beheer teamleden, uitnodigingen en zitplaatsen voor je organisatie in ViaCust." />
      <Nav />
      <main className="max-w-5xl mx-auto px-6 md:px-8 py-12">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.3em] text-brass-deep/80 mb-2">{t("team.kicker")}</p>
          <h1 className="font-display text-4xl text-brass-deep mb-2">{t("team.title")}</h1>
          <p className="text-sm text-brass-deep/70">{t("team.intro")}</p>
        </div>

        <section className="bg-white border border-brass-deep/10 p-6 mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-brass-deep/80">{t("team.company")}</p>
              <p className="text-xl text-brass-deep font-semibold">{company?.name ?? "—"}</p>
              <p className="text-xs text-brass-deep/80 mt-1">
                {t("team.seatsUsedLabel")} <strong>{seatsUsed}</strong> / {seatsAvailable}
                {seatsLeft > 0 ? ` ${t("team.seatsFree", { n: seatsLeft })}` : ` ${t("team.seatsLimitReached")}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={seatsOpen} onOpenChange={(v) => { setSeatsOpen(v); if (v) setSeatQty(Math.max(1, seatsAvailable || 1)); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CreditCard className="size-4" /> {t("team.manageSeats")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("team.seatsDialogTitle")}</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-brass-deep/70">{t("team.seatsBody")}</p>
                    <div className="flex items-center justify-center gap-4">
                      <Button variant="outline" size="icon" onClick={() => setSeatQty((q) => Math.max(1, q - 1))} disabled={seatQty <= 1}>
                        <Minus className="size-4" />
                      </Button>
                      <div className="text-3xl font-display text-brass-deep w-16 text-center">{seatQty}</div>
                      <Button variant="outline" size="icon" onClick={() => setSeatQty((q) => Math.min(50, q + 1))} disabled={seatQty >= 50}>
                        <Plus className="size-4" />
                      </Button>
                    </div>
                    <div className="text-center text-sm text-brass-deep/70 space-y-1">
                      <p dangerouslySetInnerHTML={{ __html: t("team.plannerBase") }} />
                      <p dangerouslySetInnerHTML={{ __html: t("team.driversLine", { q: seatQty, sum: (1.5 * seatQty).toFixed(2) }) }} />
                      <p className="pt-1 border-t border-brass-deep/10" dangerouslySetInnerHTML={{ __html: t("team.totalLine", { sum: (10 + 1.5 * seatQty).toFixed(2) }) }} />
                    </div>

                    {seatsUsed > seatQty && (
                      <p className="text-xs text-red-600 text-center">
                        {t("team.cannotLower", { used: seatsUsed, q: seatQty })}
                      </p>
                    )}
                    <Button
                      className="w-full"
                      disabled={seatsUsed > seatQty}
                      onClick={() => { setSeatsOpen(false); setCheckoutOpen(true); }}
                    >
                      {t("team.confirmPay")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button disabled={seatsLeft <= 0} className="gap-2">
                    <UserPlus className="size-4" /> {t("team.inviteDriver")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{t("team.inviteDialogTitle")}</DialogTitle></DialogHeader>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-brass-deep/70">{t("team.inviteIntro")}</p>
                    <Input
                      type="email"
                      placeholder={t("team.emailPlaceholder") as string}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      autoFocus
                    />
                    <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="w-full">
                      {inviting ? <><Loader2 className="size-4 animate-spin mr-2" /> {t("team.sending")}</> : t("team.sendInvite")}
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
          title={t("team.seatsTitle", { q: seatQty }) as string}
          priceId="begeleider_company_seat_v2_monthly"
          quantity={seatQty}
          customerEmail={user?.email ?? undefined}
          userId={user?.id}
          returnUrl={`${window.location.origin}/team?checkout=success&session_id={CHECKOUT_SESSION_ID}`}
        />

        {seatsLeft <= 0 && seatsAvailable === 0 && (
          <div className="mb-6 p-4 border border-brass-gold/40 bg-brass-gold/10 text-sm text-brass-deep">
            {t("team.noSeatPlan")}
          </div>
        )}

        <div className="mb-6">
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam of e-mail…"
            className="h-9"
          />
        </div>

        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-widest text-brass-deep/80 mb-3">{t("team.activeDrivers")}</h2>
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">E-mail</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Lid sinds</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="h-9 w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
                  </TableRow>
                ) : filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">{driverMembers.length === 0 ? t("team.noDrivers") : "Geen resultaten."}</TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((m) => (
                    <TableRow key={m.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs py-2 font-medium">{m.full_name || t("team.driverFallback")}</TableCell>
                      <TableCell className="text-xs py-2">{m.email ?? "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(m.joined_at)}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                          Actief
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Meer opties</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">{m.full_name || t("team.driverFallback")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-destructive focus:text-destructive"
                              onClick={() => removeDriver(m.id, m.user_id)}
                            >
                              <Trash2 className="size-3 mr-2" />
                              Verwijderen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-brass-deep/80 mb-3">{t("team.openInvites")}</h2>
          <div className="border border-border rounded-md bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">E-mail</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Verstuurd</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Verloopt</TableHead>
                  <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                  <TableHead className="h-9 w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
                  </TableRow>
                ) : filteredInvites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">{invitations.length === 0 ? t("team.noOpenInvites") : "Geen resultaten."}</TableCell>
                  </TableRow>
                ) : (
                  filteredInvites.map((inv) => (
                    <TableRow key={inv.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs py-2 font-medium">{inv.email}</TableCell>
                      <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(inv.created_at)}</TableCell>
                      <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(inv.expires_at)}</TableCell>
                      <TableCell className="py-2">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                          In afwachting
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Meer opties</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-xs">{inv.email}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs text-destructive focus:text-destructive"
                              onClick={() => revokeInvitation(inv.id)}
                            >
                              <Mail className="size-3 mr-2" />
                              {t("team.revoke")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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
