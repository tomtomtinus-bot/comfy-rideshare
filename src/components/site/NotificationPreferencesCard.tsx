import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Prefs = {
  weekly_updates: boolean;
};

const DEFAULTS: Prefs = { weekly_updates: true };

export const NotificationPreferencesCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("email_preferences")
        .eq("id", auth.user.id)
        .maybeSingle();
      const stored = (data as any)?.email_preferences ?? {};
      setPrefs({ weekly_updates: stored.weekly_updates !== false });
      setLoading(false);
    })();
  }, []);

  const update = async (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({ email_preferences: next })
      .eq("id", auth.user.id);
    setSaving(false);
    if (error) { toast.error("Opslaan mislukt"); return; }
    toast.success("Voorkeuren opgeslagen");
  };

  return (
    <section className="bg-card shadow-etched p-6 md:p-8 mb-6">
      <h2 className="font-display text-2xl text-brass-deep italic mb-1">
        Notificatie-instellingen
      </h2>
      <p className="text-[12px] text-brass-deep/60 mb-5">
        Kies welke optionele e-mails je wilt ontvangen. Systeem-e-mails
        (bevestigingen, annuleringen, facturen, betalingen) ontvang je altijd.
      </p>

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : (
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-brass-deep/10 bg-background/40 opacity-80 cursor-not-allowed">
            <input type="checkbox" checked disabled className="mt-1 accent-brass-gold" />
            <div>
              <div className="text-sm font-semibold text-brass-deep">Systeem-e-mails</div>
              <div className="text-[12px] text-brass-deep/60">
                Ritbevestigingen, matches, wijzigingen, annuleringen, facturen en
                betalingen. Verplicht — kan niet uitgezet worden.
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 border border-brass-deep/15 hover:border-brass-gold/40 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={prefs.weekly_updates}
              disabled={saving}
              onChange={(e) => update({ weekly_updates: e.target.checked })}
              className="mt-1 accent-brass-gold"
            />
            <div>
              <div className="text-sm font-semibold text-brass-deep">
                Wekelijkse updates &amp; aanbiedingen
              </div>
              <div className="text-[12px] text-brass-deep/60">
                Nieuws, productupdates en herinneringen over aflopende kortingen.
              </div>
            </div>
          </label>
        </div>
      )}
    </section>
  );
};
