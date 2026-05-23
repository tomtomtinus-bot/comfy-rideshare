import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

interface Props {
  rideId: string;
  onChanged?: () => void;
}

interface Member {
  user_id: string;
  full_name: string | null;
}

interface AssignmentInfo {
  id: string;
  status: string;
  assigned_driver_id: string | null;
  hours_submitted_at: string | null;
  hours_approved_at: string | null;
  actual_hours: number | null;
  hours_notes: string | null;
  departed_base_at: string | null;
  returned_base_at: string | null;
}

/**
 * Planner-side: koppel een chauffeur aan een geaccepteerde rit en keur uren goed.
 * Alleen zichtbaar voor de planner (hoofdaccount) van een bedrijfsaccount.
 */
export const AssignDriverPanel = ({ rideId, onChanged }: Props) => {
  const { user } = useAuth();
  const { companyId, isPlanner } = useCompany();
  const [assignment, setAssignment] = useState<AssignmentInfo | null>(null);
  const [drivers, setDrivers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string>("");

  const load = async () => {
    if (!user || !companyId) return;
    // Vind de assignment van de planner zelf voor deze rit.
    const { data: a } = await supabase
      .from("ride_assignments")
      .select("id, status, assigned_driver_id, hours_submitted_at, hours_approved_at, actual_hours, hours_notes, departed_base_at, returned_base_at")
      .eq("ride_id", rideId)
      .eq("escort_id", user.id)
      .maybeSingle();
    setAssignment((a as any) ?? null);
    setSelected((a as any)?.assigned_driver_id ?? "");

    // Haal chauffeurs op binnen dit bedrijf.
    const { data: m } = await supabase
      .from("company_members")
      .select("user_id, role, status")
      .eq("company_id", companyId)
      .eq("role", "driver")
      .eq("status", "active");
    const ids = (m ?? []).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      setDrivers(ids.map((id) => ({ user_id: id, full_name: map.get(id) ?? null })));
    } else {
      setDrivers([]);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [rideId, user?.id, companyId]);

  if (!isPlanner || !assignment) return null;
  if (assignment.status !== "accepted" && !assignment.assigned_driver_id) return null;

  const assignDriver = async () => {
    if (!assignment) return;
    setBusy(true);
    const { error } = await supabase
      .from("ride_assignments")
      .update({ assigned_driver_id: selected || null })
      .eq("id", assignment.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(selected ? "Chauffeur toegewezen" : "Toewijzing verwijderd");
    await load();
    onChanged?.();
  };

  const approveHours = async () => {
    if (!assignment || !user) return;
    setBusy(true);
    const { error } = await supabase
      .from("ride_assignments")
      .update({ hours_approved_at: new Date().toISOString(), hours_approved_by: user.id })
      .eq("id", assignment.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Uren goedgekeurd");
    await load();
    onChanged?.();
  };

  const currentDriver = drivers.find((d) => d.user_id === assignment.assigned_driver_id);
  const awaitingApproval = !!assignment.hours_submitted_at && !assignment.hours_approved_at && !!assignment.assigned_driver_id && assignment.assigned_driver_id !== user?.id;

  return (
    <section className="bg-card shadow-etched p-6 md:p-8 border-l-4 border-brass-gold">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-brass-gold font-bold mb-1">Bedrijfsbeheer</p>
          <h2 className="font-display text-xl text-brass-deep italic">Toewijzing chauffeur</h2>
        </div>
        {currentDriver && (
          <span className="text-[10px] uppercase tracking-widest font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1">
            ✓ {currentDriver.full_name || "Chauffeur"}
          </span>
        )}
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-brass-deep/60">
          Je hebt nog geen chauffeurs in je team.{" "}
          <a href="/team" className="text-brass-gold underline">Nodig chauffeurs uit</a>.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-1">
              Voer uit met
            </label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full bg-parchment border border-brass-deep/15 px-3 py-2.5 text-sm focus:outline-none focus:border-brass-gold"
            >
              <option value="">— Ik rijd zelf —</option>
              {drivers.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.full_name || "Chauffeur zonder naam"}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={assignDriver}
            disabled={busy || selected === (assignment.assigned_driver_id ?? "")}
            className="px-5 py-2.5 bg-brass-deep text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-brass-gold transition-colors disabled:opacity-40"
          >
            Opslaan
          </button>
        </div>
      )}

      {assignment.assigned_driver_id && (
        <p className="text-xs text-brass-deep/55 mt-3">
          De chauffeur ziet deze rit in zijn eigen dashboard zonder financiële details. Jij blijft
          verantwoordelijk voor goedkeuring van de uren en de facturatie.
        </p>
      )}

      {awaitingApproval && (
        <div className="mt-6 pt-6 border-t border-brass-deep/10 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700 font-bold mb-1">
              Wacht op goedkeuring
            </p>
            <h3 className="font-display text-lg text-brass-deep italic">Door chauffeur ingevulde uren</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm bg-amber-50 border border-amber-200 p-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold mb-1">Vertrek standplaats</p>
              <p className="tabular-nums">{assignment.departed_base_at ? new Date(assignment.departed_base_at).toLocaleString("nl-NL") : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold mb-1">Terug op standplaats</p>
              <p className="tabular-nums">{assignment.returned_base_at ? new Date(assignment.returned_base_at).toLocaleString("nl-NL") : "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold mb-1">Werkelijke uren</p>
              <p className="tabular-nums text-base font-semibold">{assignment.actual_hours ?? "—"} uur</p>
            </div>
            {assignment.hours_notes && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold mb-1">Opmerkingen chauffeur</p>
                <p className="italic">"{assignment.hours_notes}"</p>
              </div>
            )}
          </div>
          <button
            onClick={approveHours}
            disabled={busy}
            className="px-5 py-2.5 bg-emerald-700 text-parchment uppercase tracking-widest text-xs font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-40"
          >
            ✓ Uren goedkeuren & doorzetten naar opdrachtgever
          </button>
        </div>
      )}

      {assignment.hours_approved_at && (
        <p className="text-xs text-emerald-700 font-semibold mt-4">
          ✓ Uren goedgekeurd op {new Date(assignment.hours_approved_at).toLocaleString("nl-NL")}
        </p>
      )}
    </section>
  );
};

export default AssignDriverPanel;
