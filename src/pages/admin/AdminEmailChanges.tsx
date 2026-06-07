import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChangeRequest {
  id: string;
  user_id: string;
  current_email: string;
  new_email: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

const fmt = (d: string) =>
  new Date(d).toLocaleString("nl-NL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const StatusChip = ({ s }: { s: string }) => {
  const map: Record<string, string> = {
    pending: "bg-brass-gold/20 text-brass-deep",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  const lab: Record<string, string> = { pending: "In afwachting", approved: "Goedgekeurd", rejected: "Afgewezen" };
  return <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${map[s] ?? "bg-muted"}`}>{lab[s] ?? s}</span>;
};

const AdminEmailChanges = () => {
  const [rows, setRows] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_change_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Kon aanvragen niet laden: " + error.message);
    else setRows((data as ChangeRequest[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    if (!confirm("E-mailwijziging goedkeuren? Er wordt een bevestigingsmail naar het nieuwe adres gestuurd.")) return;
    setBusyId(id);
    const { data, error } = await supabase.functions.invoke("admin-approve-email-change", { body: { requestId: id } });
    setBusyId(null);
    if (error || (data && (data as any).error)) {
      toast.error(((data as any)?.error) || error?.message || "Goedkeuren mislukt");
    } else {
      toast.success("Goedgekeurd — bevestigingsmail verstuurd naar nieuw adres");
      load();
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reden van afwijzing (optioneel):") ?? null;
    const { error } = await supabase
      .from("email_change_requests")
      .update({ status: "rejected", rejection_reason: reason, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Afgewezen"); load(); }
  };

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">E-mailwijzigingen</h2>
        <p className="text-sm text-brass-deep/80 mt-1">
          {rows.length} aanvragen
          {pendingCount > 0 && <> · <span className="text-brass-gold font-semibold">{pendingCount} wacht{pendingCount === 1 ? "" : "en"} op goedkeuring</span></>}
        </p>
      </header>

      <div className="flex gap-1 bg-brass-deep/10 p-1 w-fit">
        {(["pending", "approved", "rejected", "all"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`text-[10px] uppercase tracking-widest font-bold px-3 py-2 ${filter === k ? "bg-brass-deep text-parchment" : "text-brass-deep hover:bg-parchment"}`}>
            {k === "all" ? "Alle" : k === "pending" ? "Wacht" : k === "approved" ? "Goedgekeurd" : "Afgewezen"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-brass-deep/80">Geen aanvragen.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {filtered.map((r) => (
            <li key={r.id} className="bg-card p-4 md:p-5">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 md:col-span-7">
                  <p className="text-xs text-brass-deep/80">Van</p>
                  <p className="font-medium break-all">{r.current_email}</p>
                  <p className="text-xs text-brass-deep/80 mt-2">Naar</p>
                  <p className="font-medium break-all text-brass-gold">{r.new_email}</p>
                  {r.rejection_reason && <p className="text-[11px] text-red-700 mt-2">Reden: {r.rejection_reason}</p>}
                </div>
                <div className="col-span-6 md:col-span-2"><StatusChip s={r.status} /></div>
                <div className="col-span-6 md:col-span-3 flex flex-wrap gap-1.5 md:justify-end">
                  {r.status === "pending" && (
                    <>
                      <button disabled={busyId === r.id} onClick={() => approve(r.id)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 bg-emerald-700 text-parchment hover:bg-emerald-800 disabled:opacity-50">
                        Goedkeuren
                      </button>
                      <button onClick={() => reject(r.id)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-red-700/40 text-red-700 hover:bg-red-50">
                        Afwijzen
                      </button>
                    </>
                  )}
                </div>
                <p className="col-span-12 text-[10px] text-brass-deep/80 tabular-nums">
                  Aangevraagd {fmt(r.created_at)}
                  {r.decided_at && <> · beslist {fmt(r.decided_at)}</>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminEmailChanges;
