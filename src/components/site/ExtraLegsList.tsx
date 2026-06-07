import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapsLink } from "@/components/site/MapsLink";

interface ExtraLeg {
  pickup_address: string;
  pickup_city: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_city: string;
  dropoff_lat: number;
  dropoff_lng: number;
  scheduled_at: string;
  end_at?: string | null;
  permit_number?: string | null;
  drivers?: { name: string; phone: string }[] | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" });

export const ExtraLegsList = ({ rideId }: { rideId: string }) => {
  const [legs, setLegs] = useState<ExtraLeg[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("rides")
        .select("extra_legs")
        .eq("id", rideId)
        .maybeSingle();
      if (!active) return;
      const arr = (data?.extra_legs as unknown as ExtraLeg[] | null) ?? [];
      setLegs(Array.isArray(arr) ? arr : []);
    })();
    return () => { active = false; };
  }, [rideId]);

  if (!legs || legs.length === 0) return null;

  return (
    <section className="bg-card shadow-etched p-6 md:p-8">
      <h2 className="font-display text-xl text-brass-deep italic mb-1">Aansluitende ritten</h2>
      <p className="text-xs text-brass-deep/80 mb-4">
        Begeleidingstijd loopt door van rit 1 tot einde laatste rit.
      </p>
      <ol className="space-y-3">
        {legs.map((leg, i) => (
          <li key={i} className="bg-parchment/40 p-4 border border-brass-deep/10">
            <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
              <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold">Rit {i + 2}</p>
              <div className="text-xs text-brass-deep/70 tabular-nums text-right">
                <p>{fmt(leg.scheduled_at)}{leg.end_at ? ` → ${new Date(leg.end_at).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
                {leg.end_at && (() => {
                  const min = Math.round((new Date(leg.end_at).getTime() - new Date(leg.scheduled_at).getTime()) / 60_000);
                  if (min <= 0) return null;
                  const h = Math.floor(min / 60), m = min % 60;
                  return <p className="text-brass-deep/80">{h ? `${h}u ` : ""}{m ? `${m}m` : (h ? "" : "0m")}</p>;
                })()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Vertrek</p>
                <MapsLink address={`${leg.pickup_address}, ${leg.pickup_city}`} lat={leg.pickup_lat} lng={leg.pickup_lng} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Bestemming</p>
                <MapsLink address={`${leg.dropoff_address}, ${leg.dropoff_city}`} lat={leg.dropoff_lat} lng={leg.dropoff_lng} />
              </div>
            </div>
            {leg.permit_number && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Vergunningnummer</p>
                <p className="text-sm text-brass-deep">{leg.permit_number}</p>
              </div>
            )}
            {leg.drivers && leg.drivers.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-1">Chauffeurs</p>
                <ul className="text-sm text-brass-deep space-y-0.5">
                  {leg.drivers.map((d, di) => (
                    <li key={di}>
                      {d.name}{d.phone ? ` · ${d.phone}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
