import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "submitting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.valid) setState({ kind: "ready" });
        else if (data.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      })
      .catch(() => setState({ kind: "invalid" }));
  }, [token]);

  const onConfirm = async () => {
    setState({ kind: "submitting" });
    const { data, error } = await supabase.functions.invoke(
      "handle-email-unsubscribe",
      { body: { token } },
    );
    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    if ((data as any)?.success) setState({ kind: "done" });
    else if ((data as any)?.reason === "already_unsubscribed")
      setState({ kind: "already" });
    else setState({ kind: "error", message: "Onbekende fout" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full bg-card shadow-etched p-8 border-l-4 border-brass-gold">
        <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-3">
          ViaCust
        </p>
        <h1 className="font-display text-3xl text-brass-deep italic leading-tight mb-4">
          Uitschrijven
        </h1>

        {state.kind === "loading" && (
          <p className="text-muted-foreground text-sm">Bezig met controleren…</p>
        )}

        {state.kind === "ready" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Klik op de knop hieronder om je uit te schrijven voor toekomstige
              app-e-mails van ViaCust.
            </p>
            <Button onClick={onConfirm} className="w-full">
              Bevestig uitschrijving
            </Button>
          </>
        )}

        {state.kind === "submitting" && (
          <p className="text-muted-foreground text-sm">Bezig met uitschrijven…</p>
        )}

        {state.kind === "done" && (
          <p className="text-sm text-foreground">
            Je bent uitgeschreven. Je ontvangt geen app-e-mails meer van ViaCust.
          </p>
        )}

        {state.kind === "already" && (
          <p className="text-sm text-foreground">
            Je was al uitgeschreven. Geen verdere actie nodig.
          </p>
        )}

        {state.kind === "invalid" && (
          <p className="text-sm text-destructive">
            Deze uitschrijflink is ongeldig of verlopen.
          </p>
        )}

        {state.kind === "error" && (
          <p className="text-sm text-destructive">Er ging iets mis: {state.message}</p>
        )}
      </div>
    </main>
  );
};

export default Unsubscribe;
