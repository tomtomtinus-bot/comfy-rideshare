import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { emptyTravelMinutes } from "@/lib/geo";

type Candidate = {
  id: string;
  anonymous_id: string | null;
  base_city: string | null;
  hourly_rate: number | null;
  rating: number | null;
  rides_completed: number | null;
  vehicle_type: string | null;
  languages: string[] | null;
  aanvoer_km: number | null;
  afvoer_km: number | null;
};

// Reistijd voor leegrijden (aan-/afvoer) — zelfde berekening als bij de hoofdaanvraag:
// 100 km/u, naar boven afgerond op een kwartier.
const kmToTime = (km: number | null) => {
  if (km == null) return "—";
  const total = emptyTravelMinutes(km);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}u`;
  return `${h}u ${m}m`;
};

export const ReplacementEscortPicker = ({
  rideId,
  open,
  onOpenChange,
  onInvited,
}: {
  rideId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .rpc("find_replacement_candidates", { _ride_id: rideId, _limit: 20 })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setCandidates((data as Candidate[]) ?? []);
        setLoading(false);
      });
  }, [open, rideId]);

  const invite = async (escortId: string) => {
    setBusyId(escortId);
    const { error } = await supabase.rpc("invite_specific_replacement", {
      _ride_id: rideId,
      _escort_id: escortId,
    });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Begeleider uitgenodigd.");
    setCandidates((c) => c.filter((x) => x.id !== escortId));
    onInvited();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic text-brass-deep">
            Kies een nieuwe begeleider
          </DialogTitle>
          <DialogDescription>
            Beschikbare begeleiders, gesorteerd op reistijd tot het ophaaladres.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-brass-deep/60 py-8 text-center">Beschikbare begeleiders laden…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-brass-deep/60 py-8 text-center">
            Geen beschikbare begeleiders gevonden. Probeer "Automatisch zoeken".
          </p>
        ) : (
          <ul className="divide-y divide-brass-deep/10">
            {candidates.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    Begeleider #{c.anonymous_id ?? "—"}
                  </p>
                  <p className="text-xs text-brass-deep/60 mt-0.5">
                    {c.base_city ?? "—"} · {c.vehicle_type ?? "—"} · €{Number(c.hourly_rate ?? 0).toFixed(2)}/u ·{" "}
                    ★ {Number(c.rating ?? 0).toFixed(1)} ({c.rides_completed ?? 0})
                  </p>
                  <p className="text-xs text-brass-deep/70 mt-1 tabular-nums">
                    Aanvoer: <span className="font-medium">{kmToTime(c.aanvoer_km)}</span>
                    {" · "}
                    Afvoer: <span className="font-medium">{kmToTime(c.afvoer_km)}</span>
                  </p>
                </div>
                <button
                  disabled={busyId === c.id}
                  onClick={() => invite(c.id)}
                  className="shrink-0 px-3 py-2 bg-brass-deep text-parchment uppercase tracking-widest text-[10px] font-semibold hover:bg-brass-gold disabled:opacity-50"
                >
                  Uitnodigen
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
