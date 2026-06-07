import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Candidate = {
  id: string;
  anonymous_id: string | null;
  base_city: string | null;
  hourly_rate: number | null;
  rating: number | null;
  rides_completed: number | null;
  vehicle_type: string | null;
  languages: string[] | null;
  base_lat: number | null;
  base_lng: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  aanvoer_km: number | null;
  afvoer_km: number | null;
  aanvoerMin?: number | null;
  afvoerMin?: number | null;
};

// Zelfde afronding als de hoofdaanvraag: minimaal 15 minuten,
// naar boven afgerond op een kwartier.
const roundQuarter = (sec: number) => Math.max(15, Math.ceil((sec / 60) / 15) * 15);

const fmtMin = (min: number | null | undefined) => {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
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
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("find_replacement_candidates", {
        _ride_id: rideId,
        _limit: 20,
      });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setCandidates([]);
        setLoading(false);
        return;
      }
      const base = (data as Candidate[]) ?? [];
      setCandidates(base);
      setLoading(false);

      // Reistijden via Google Maps (zonder verkeer = "schone" reistijd, geen files),
      // identiek aan de hoofdaanvraag.
      const fetchLeg = async (
        origin: { lat: number; lng: number } | null,
        destination: { lat: number; lng: number } | null,
      ): Promise<number | null> => {
        if (!origin || !destination) return null;
        try {
          const { data: d, error: e } = await supabase.functions.invoke("google-directions", {
            body: { origin, destination },
          });
          if (e || !d?.duration_s) return null;
          return roundQuarter(Number(d.duration_s));
        } catch {
          return null;
        }
      };

      const enriched = await Promise.all(
        base.map(async (c) => {
          const baseLoc = c.base_lat != null && c.base_lng != null ? { lat: c.base_lat, lng: c.base_lng } : null;
          const pickup = c.pickup_lat != null && c.pickup_lng != null ? { lat: c.pickup_lat, lng: c.pickup_lng } : null;
          const dropoff = c.dropoff_lat != null && c.dropoff_lng != null ? { lat: c.dropoff_lat, lng: c.dropoff_lng } : null;
          const [aanvoer, afvoer] = await Promise.all([
            fetchLeg(baseLoc, pickup),
            fetchLeg(dropoff, baseLoc),
          ]);
          return { ...c, aanvoerMin: aanvoer, afvoerMin: afvoer };
        }),
      );
      if (cancelled) return;
      // Sorteer op aanvoertijd (Google) waar beschikbaar, anders houd huidige volgorde
      enriched.sort((a, b) => {
        const av = a.aanvoerMin ?? Number.POSITIVE_INFINITY;
        const bv = b.aanvoerMin ?? Number.POSITIVE_INFINITY;
        return av - bv;
      });
      setCandidates(enriched);
    })();
    return () => {
      cancelled = true;
    };
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
          <p className="text-sm text-brass-deep/80 py-8 text-center">Beschikbare begeleiders laden…</p>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-brass-deep/80 py-8 text-center">
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
                  <p className="text-xs text-brass-deep/80 mt-0.5">
                    {c.base_city ?? "—"} · {c.vehicle_type ?? "—"} · €{Number(c.hourly_rate ?? 0).toFixed(2)}/u ·{" "}
                    ★ {Number(c.rating ?? 0).toFixed(1)} ({c.rides_completed ?? 0})
                  </p>
                  <p className="text-xs text-brass-deep/70 mt-1 tabular-nums">
                    Aanvoer: <span className="font-medium">{fmtMin(c.aanvoerMin)}</span>
                    {" · "}
                    Afvoer: <span className="font-medium">{fmtMin(c.afvoerMin)}</span>
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
