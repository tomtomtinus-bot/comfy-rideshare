import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SwapOption {
  ride_id: string;
  pickup_city: string;
  dropoff_city: string;
  scheduled_at: string;
  status: string;
  has_accepted_escort: boolean;
  target_escort_anon: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });

export const SwapRequestDialog = ({
  open,
  onOpenChange,
  sourceAssignmentId,
  escortAnon,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAssignmentId: string;
  escortAnon: string | null;
  onCreated?: () => void;
}) => {
  const [options, setOptions] = useState<SwapOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected("");
    setReason("");
    setLoading(true);
    supabase
      .rpc("get_swap_options_for_assignment", { _source_assignment_id: sourceAssignmentId })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setOptions((data ?? []) as SwapOption[]);
        setLoading(false);
      });
  }, [open, sourceAssignmentId]);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("client_request_swap", {
      _source_assignment_id: sourceAssignmentId,
      _target_ride_id: selected,
      _reason: reason.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Verzoek verstuurd. De begeleider(s) ontvangen een notificatie.");
    onOpenChange(false);
    onCreated?.();
  };

  const openRides = options.filter((o) => !o.has_accepted_escort);
  const swapRides = options.filter((o) => o.has_accepted_escort);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-parchment max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-brass-deep italic">
            Begeleider verplaatsen
          </DialogTitle>
          <DialogDescription>
            Kies een andere rit voor begeleider #{escortAnon ?? "????"}. De begeleider moet akkoord
            geven; bij een ruil moeten beide begeleiders akkoord.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-brass-deep/50">Laden…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-brass-deep/60">
            Geen geschikte ritten gevonden. Vereist: een toekomstige eigen rit waar deze begeleider
            nog niet op staat.
          </p>
        ) : (
          <div className="space-y-5">
            {openRides.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-2">
                  Open ritten zonder begeleider
                </p>
                <ul className="space-y-px bg-brass-deep/10">
                  {openRides.map((r) => (
                    <li key={r.ride_id}>
                      <label className="flex items-start gap-3 bg-card p-3 cursor-pointer hover:bg-brass-gold/5">
                        <input
                          type="radio"
                          name="swap"
                          value={r.ride_id}
                          checked={selected === r.ride_id}
                          onChange={() => setSelected(r.ride_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {r.pickup_city} <span className="text-brass-gold">→</span> {r.dropoff_city}
                          </p>
                          <p className="text-xs text-brass-deep/55 tabular-nums">{fmt(r.scheduled_at)}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {swapRides.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-gold font-bold mb-2">
                  Ritten met andere begeleider (ruil — beide moeten akkoord)
                </p>
                <ul className="space-y-px bg-brass-deep/10">
                  {swapRides.map((r) => (
                    <li key={r.ride_id}>
                      <label className="flex items-start gap-3 bg-card p-3 cursor-pointer hover:bg-brass-gold/5">
                        <input
                          type="radio"
                          name="swap"
                          value={r.ride_id}
                          checked={selected === r.ride_id}
                          onChange={() => setSelected(r.ride_id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {r.pickup_city} <span className="text-brass-gold">→</span> {r.dropoff_city}
                          </p>
                          <p className="text-xs text-brass-deep/55 tabular-nums">{fmt(r.scheduled_at)}</p>
                          <p className="text-[10px] text-brass-deep/55 mt-1">
                            Huidige begeleider: #{r.target_escort_anon ?? "????"}
                          </p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-brass-deep/60 font-bold mb-1">
                Reden (optioneel)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={300}
                className="w-full bg-card border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
                placeholder="Waarom wil je deze begeleider verplaatsen?"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 border border-brass-deep/30 uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-deep/5"
              >
                Annuleren
              </button>
              <button
                type="button"
                disabled={!selected || busy}
                onClick={submit}
                className="px-5 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
              >
                Verzoek versturen
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
