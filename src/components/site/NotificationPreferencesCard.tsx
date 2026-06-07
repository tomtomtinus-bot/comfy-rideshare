import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Notificatie-instellingen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Kies welke optionele e-mails je wilt ontvangen. Systeem-e-mails
          (bevestigingen, annuleringen, facturen, betalingen) ontvang je altijd.
        </p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30 opacity-80 cursor-not-allowed">
              <Checkbox checked disabled className="mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground">Systeem-e-mails</div>
                <div className="text-xs text-muted-foreground">
                  Ritbevestigingen, matches, wijzigingen, annuleringen, facturen en
                  betalingen. Verplicht — kan niet uitgezet worden.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-md border border-border hover:border-muted-foreground/30 cursor-pointer transition-colors">
              <Checkbox
                checked={prefs.weekly_updates}
                disabled={saving}
                onCheckedChange={(checked) => update({ weekly_updates: !!checked })}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-foreground">
                  Wekelijkse updates &amp; aanbiedingen
                </div>
                <div className="text-xs text-muted-foreground">
                  Nieuws, productupdates en herinneringen over aflopende kortingen.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-md border border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    Pushmeldingen op dit apparaat
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ontvang directe meldingen bij nieuwe ritaanvragen, matches en wijzigingen
                    &mdash; ook als je de app niet open hebt.
                  </div>
                  {push.status === "unsupported" && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Pushmeldingen werken niet in deze omgeving. Open de site op{" "}
                      <strong>viacust.com</strong> in je browser.
                    </div>
                  )}
                  {push.status === "blocked" && (
                    <div className="text-xs text-destructive mt-2">
                      Meldingen zijn geblokkeerd in je browserinstellingen. Sta ze handmatig
                      toe en probeer opnieuw.
                    </div>
                  )}
                  {isIOS && !isStandalone && push.status !== "unsupported" && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Op iPhone/iPad: open in Safari, tik op het deel-icoon en kies
                      &ldquo;Zet op beginscherm&rdquo;. Open daarna de app via het icoon
                      om meldingen aan te zetten.
                    </div>
                  )}
                </div>
                {push.status === "subscribed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={push.disable}
                    disabled={push.busy}
                  >
                    Uitzetten
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={push.enable}
                    disabled={push.busy || push.status === "unsupported" || push.status === "blocked"}
                  >
                    {push.busy ? "Bezig…" : "Aanzetten"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
