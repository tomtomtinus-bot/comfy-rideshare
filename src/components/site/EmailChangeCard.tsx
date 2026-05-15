import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="bg-parchment/60 border border-brass-deep/10 p-5 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">Huidig e-mailadres</p>
        <p className="text-sm font-semibold text-brass-deep break-all">{user.email}</p>
      </div>

      {pending ? (
        <div className="bg-brass-gold/10 border border-brass-gold/30 p-3 text-xs text-brass-deep">
          Aanvraag in afwachting van goedkeuring naar <strong className="break-all">{pending.new_email}</strong>.
          Na goedkeuring ontvang je op het nieuwe adres een bevestigingsmail. Pas na bevestiging kun je met dat adres inloggen.
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold">
            Aanvragen e-mailadres veranderen
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nieuw@voorbeeld.nl"
              className="flex-1 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
            />
            <button
              onClick={submit}
              disabled={busy || !newEmail.trim()}
              className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
            >
              Aanvraag indienen
            </button>
          </div>
          <p className="text-[11px] text-brass-deep/50">
            Een admin keurt je aanvraag goed. Daarna ontvang je op het nieuwe adres een bevestigingsmail.
          </p>
        </div>
      )}
    </div>
  );
};
