import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const EmailChangeCard = () => {
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ new_email: string; created_at: string } | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_change_requests")
      .select("new_email, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .maybeSingle();
    setPending((data as any) ?? null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const submit = async () => {
    if (!user) return;
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { toast.error("Ongeldig e-mailadres"); return; }
    if (email === (user.email ?? "").toLowerCase()) { toast.error("Dit is al je huidige adres"); return; }
    setBusy(true);
    const { error } = await supabase.from("email_change_requests").insert({
      user_id: user.id,
      current_email: user.email ?? "",
      new_email: email,
      status: "pending",
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Aanvraag ingediend — een admin moet deze goedkeuren");
    setNewEmail("");
    load();
  };

  if (!user) return null;

  return (
    <Card className="mb-6">
      <CardContent className="py-5 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Huidig e-mailadres</Label>
          <p className="text-sm font-medium text-foreground break-all mt-1">{user.email}</p>
        </div>

        {pending ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-foreground">
            Aanvraag in afwachting van goedkeuring naar <strong className="break-all">{pending.new_email}</strong>.
            Na goedkeuring ontvang je op het nieuwe adres een bevestigingsmail. Pas na bevestiging kun je met dat adres inloggen.
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">E-mailadres wijzigen</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nieuw@voorbeeld.nl"
                className="flex-1"
              />
              <Button
                onClick={submit}
                disabled={busy || !newEmail.trim()}
                size="sm"
              >
                Aanvraag Indienen
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Een admin keurt je aanvraag goed. Daarna ontvang je op het nieuwe adres een bevestigingsmail.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
