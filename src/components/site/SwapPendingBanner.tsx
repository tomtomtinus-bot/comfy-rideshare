import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SwapRow {
  id: string;
  source_assignment_id: string;
  source_ride_id: string;
  target_ride_id: string;
  source_escort_anon: string | null;
  target_escort_anon: string | null;
  source_route: string;
  target_route: string;
  source_scheduled_at: string;
  target_scheduled_at: string;
  source_decision: string;
  target_decision: string;
  status: string;
  reason: string | null;
  expires_at: string;
  is_source_side: boolean;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

export const SwapPendingBanner = ({
  rideId,
  currentUserId,
  onChanged,
}: {
  rideId: string;
  currentUserId: string;
  onChanged?: () => void;
}) => {
  const [rows, setRows] = useState<SwapRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_swap_requests_for_ride", { _ride_id: rideId });
    if (error) return;
    setRows((data ?? []) as SwapRow[]);
  }, [rideId]);

  useEffect(() => { load(); }, [load]);

  const decide = async (id: string, approve: boolean) => {
    setBusy(true);
    const { error } = await supabase.rpc("escort_decide_swap", { _swap_id: id, _approve: approve });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Akkoord gegeven." : "Geweigerd.");
    load();
    onChanged?.();
  };

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      {rows.map((s) => {
        const isSource = s.is_source_side;
        const myDecision = isSource ? s.source_decision : s.target_decision;
        const otherDecision = isSource ? s.target_decision : s.source_decision;
        const otherAnon = isSource ? s.target_escort_anon : s.source_escort_anon;
        const otherRoute = isSource ? s.target_route : s.source_route;
        const otherWhen = isSource ? s.target_scheduled_at : s.source_scheduled_at;
        const isSwap = otherDecision !== "n_a";

        return (
          <section key={s.id} className="bg-brass-gold/10 border-l-4 border-brass-gold p-5 md:p-6">
            <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-1">
              🔄 Verzoek tot ritwissel
            </p>
            <h3 className="font-display text-lg text-brass-deep italic mb-2">
              Verplaatsen naar: {otherRoute}
            </h3>
            <p className="text-sm text-brass-deep/70">
              Nieuwe datum: <strong>{fmt(otherWhen)}</strong>
            </p>
            {isSwap && (
              <p className="text-xs text-brass-deep/60 mt-1">
                Ruil met begeleider #{otherAnon ?? "????"} — beide moeten akkoord gaan.
              </p>
            )}
            {s.reason && (
              <p className="text-sm text-brass-deep/80 italic mt-2">"{s.reason}"</p>
            )}
            <p className="text-[10px] text-brass-deep/50 mt-2">
              Vervalt op {fmt(s.expires_at)}
            </p>

            {myDecision === "pending" ? (
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide(s.id, true)}
                  className="px-4 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
                >
                  Akkoord
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide(s.id, false)}
                  className="px-4 py-2 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep/5 disabled:opacity-50"
                >
                  Weigeren
                </button>
              </div>
            ) : (
              <p className="text-xs uppercase tracking-widest font-bold text-brass-deep mt-3">
                {myDecision === "accepted"
                  ? isSwap && otherDecision === "pending"
                    ? "Wacht op andere begeleider…"
                    : "Akkoord gegeven."
                  : "Geweigerd."}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
};
