import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";

type Prefs = {
  weekly_updates: boolean;
};

const DEFAULTS: Prefs = { weekly_updates: true };

const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = typeof window !== "undefined" && (
  window.matchMedia?.("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true
);

export const NotificationPreferencesCard = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const push = usePushSubscription();

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
      <p className="text-[12px] text-brass-deep/80 mb-5">
        Kies welke optionele e-mails je wilt ontvangen. Systeem-e-mails
        (bevestigingen, annuleringen, facturen, betalingen) ontvang je altijd.
      </p>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : (
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border border-brass-deep/10 bg-background/40 opacity-80 cursor-not-allowed">
            <input type="checkbox" checked disabled className="mt-1 accent-brass-gold" />
            <div>
              <div className="text-sm font-semibold text-brass-deep">Systeem-e-mails</div>
              <div className="text-[12px] text-brass-deep/80">
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
              <div className="text-[12px] text-brass-deep/80">
                Nieuws, productupdates en herinneringen over aflopende kortingen.
              </div>
            </div>
          </label>

          <div className="p-3 border border-brass-deep/15">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold text-brass-deep">
                  Pushmeldingen op dit apparaat
                </div>
                <div className="text-[12px] text-brass-deep/80">
                  Ontvang directe meldingen bij nieuwe ritaanvragen, matches en wijzigingen
                  &mdash; ook als je de app niet open hebt.
                </div>
                {push.status === "unsupported" && (
                  <div className="text-[12px] text-brass-deep/80 mt-2">
                    Pushmeldingen werken niet in deze omgeving. Open de site op{" "}
                    <strong>viacust.com</strong> in je browser.
                  </div>
                )}
                {push.status === "blocked" && (
                  <div className="text-[12px] text-red-700 mt-2">
                    Meldingen zijn geblokkeerd in je browserinstellingen. Sta ze handmatig
                    toe en probeer opnieuw.
                  </div>
                )}
                {isIOS && !isStandalone && push.status !== "unsupported" && (
                  <div className="text-[12px] text-brass-deep/80 mt-2">
                    Op iPhone/iPad: open in Safari, tik op het deel-icoon en kies
                    &ldquo;Zet op beginscherm&rdquo;. Open daarna de app via het icoon
                    om meldingen aan te zetten.
                  </div>
                )}
              </div>
              {push.status === "subscribed" ? (
                <button
                  type="button"
                  onClick={push.disable}
                  disabled={push.busy}
                  className="px-3 py-2 text-xs font-semibold border border-brass-deep/30 text-brass-deep hover:bg-brass-deep/5 disabled:opacity-50"
                >
                  Uitzetten
                </button>
              ) : (
                <button
                  type="button"
                  onClick={push.enable}
                  disabled={push.busy || push.status === "unsupported" || push.status === "blocked"}
                  className="px-3 py-2 text-xs font-semibold bg-brass-gold text-brass-deep hover:bg-brass-gold/90 disabled:opacity-50"
                >
                  {push.busy ? "Bezig…" : "Aanzetten"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
