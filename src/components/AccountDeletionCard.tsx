import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="bg-parchment/60 border border-red-300/50 p-5 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-red-800 font-bold">Account verwijderen</p>
      {scheduled ? (
        <>
          <div className="bg-red-100/60 border border-red-300 p-3 text-xs text-red-900">
            Je account wordt verwijderd op{" "}
            <strong>{new Date(scheduled).toLocaleDateString("nl-NL", { dateStyle: "long" })}</strong>.
            Tot die datum kun je dit verzoek nog annuleren.
          </div>
          <button
            onClick={cancelDelete}
            disabled={busy}
            className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
          >
            Verwijdering annuleren
          </button>
        </>
      ) : (
        <>
          <p className="text-[12px] text-brass-deep/80">
            Je account en gegevens worden over 30 dagen definitief verwijderd.
            Tot die tijd kun je het verzoek nog ongedaan maken. Actieve abonnementen
            worden direct opgezegd aan het einde van de huidige periode.
          </p>
          <button
            onClick={requestDelete}
            disabled={busy}
            className="px-4 py-2 bg-red-700 text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            Account verwijderen
          </button>
        </>
      )}
    </div>
  );
};
