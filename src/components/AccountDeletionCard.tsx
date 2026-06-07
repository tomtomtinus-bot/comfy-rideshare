import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const AccountDeletionCard = () => {
  const { user } = useAuth();
  const [scheduled, setScheduled] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("deletion_scheduled_at")
      .eq("id", user.id)
      .maybeSingle();
    setScheduled((data as any)?.deletion_scheduled_at ?? null);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const requestDelete = async () => {
    if (!user) return;
    if (!confirm("Weet je zeker dat je je account wilt verwijderen?\n\nJe account en gegevens worden over 30 dagen definitief verwijderd. Binnen die 30 dagen kun je dit nog ongedaan maken.")) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { body: {} });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verwijderverzoek geregistreerd");
    load();
  };

  const cancelDelete = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("cancel-account-deletion", { body: {} });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Verwijdering geannuleerd");
    load();
  };

  if (!user) return null;

  return (
    <Card className="mb-6 border-destructive/20">
      <CardContent className="py-5 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Verwijderen</p>
        {scheduled ? (
          <>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm text-destructive">
              Je account wordt verwijderd op{" "}
              <strong>{new Date(scheduled).toLocaleDateString("nl-NL", { dateStyle: "long" })}</strong>.
              Tot die datum kun je dit verzoek nog annuleren.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={cancelDelete}
              disabled={busy}
            >
              Verwijdering Annuleren
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Je account en gegevens worden over 30 dagen definitief verwijderd.
              Tot die tijd kun je het verzoek nog ongedaan maken. Actieve abonnementen
              worden direct opgezegd aan het einde van de huidige periode.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={requestDelete}
              disabled={busy}
            >
              Account Verwijderen
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
