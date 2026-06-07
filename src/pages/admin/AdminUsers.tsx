import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
  anonymous_id: string | null;
  approval_status: "pending" | "approved" | "rejected" | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "short", year: "numeric" });

const RoleChip = ({ role }: { role: string }) => {
  const map: Record<string, string> = {
    admin: "bg-brass-gold text-parchment",
    opdrachtgever: "bg-patina text-brass-deep",
    begeleider: "bg-brass-deep/10 text-brass-deep",
  };
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${map[role] ?? "bg-muted"}`}>
      {role}
    </span>
  );
};

const StatusChip = ({ status }: { status: AdminUser["approval_status"] }) => {
  const map: Record<string, string> = {
    pending: "bg-brass-gold/20 text-brass-deep",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
  };
  const label: Record<string, string> = {
    pending: "In afwachting",
    approved: "Goedgekeurd",
    rejected: "Afgewezen",
  };
  const k = status ?? "pending";
  return (
    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${map[k]}`}>
      {label[k]}
    </span>
  );
};

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) {
      toast.error("Kon gebruikers niet laden: " + error.message);
    } else {
      setUsers((data as AdminUser[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const promote = async () => {
    if (!promoteEmail.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_promote_user", { _email: promoteEmail.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Gebruiker is nu admin");
      setPromoteEmail("");
      load();
    }
  };

  const setRole = async (uid: string, role: "opdrachtgever" | "begeleider") => {
    const { error } = await supabase.rpc("admin_set_role", { _user_id: uid, _role: role });
    if (error) toast.error(error.message);
    else {
      toast.success("Rol bijgewerkt");
      load();
    }
  };

  const revokeAdmin = async (uid: string) => {
    if (uid === user?.id) {
      toast.error("Je kunt je eigen admin-rol niet intrekken");
      return;
    }
    if (!confirm("Admin-rol intrekken voor deze gebruiker?")) return;
    const { error } = await supabase.rpc("admin_revoke_admin", { _user_id: uid });
    if (error) toast.error(error.message);
    else {
      toast.success("Admin-rol ingetrokken");
      load();
    }
  };

  const approve = async (uid: string) => {
    const { error } = await supabase.rpc("admin_approve_user", { _user_id: uid });
    if (error) toast.error(error.message);
    else {
      toast.success("Account goedgekeurd");
      load();
    }
  };

  const removeUser = async (uid: string, label: string) => {
    if (uid === user?.id) {
      toast.error("Je kunt je eigen account niet verwijderen");
      return;
    }
    if (!confirm(`Account "${label}" definitief verwijderen?\n\nDit verwijdert de gebruiker, het profiel en alle gekoppelde gegevens. Deze actie kan niet ongedaan worden gemaakt.`)) return;
    const { error } = await supabase.rpc("admin_delete_user", { _user_id: uid });
    if (error) toast.error(error.message);
    else {
      toast.success("Account verwijderd");
      load();
    }
  };

  const reject = async (uid: string) => {
    const reason = window.prompt("Optionele reden van afwijzing:") ?? null;
    const { error } = await supabase.rpc("admin_reject_user", { _user_id: uid, _reason: reason });
    if (error) toast.error(error.message);
    else {
      toast.success("Account afgewezen");
      load();
    }
  };

  const filtered = users.filter((u) => {
    if (filter !== "all" && (u.approval_status ?? "pending") !== filter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.company_name ?? "").toLowerCase().includes(q) ||
      (u.anonymous_id ?? "").toLowerCase().includes(q)
    );
  });

  const pendingCount = users.filter((u) => (u.approval_status ?? "pending") === "pending").length;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Gebruikers & rollen</h2>
        <p className="text-sm text-brass-deep/80 mt-1">
          {users.length} geregistreerde gebruiker{users.length === 1 ? "" : "s"}
          {pendingCount > 0 && (
            <> · <span className="text-brass-gold font-semibold">{pendingCount} wacht{pendingCount === 1 ? "" : "en"} op goedkeuring</span></>
          )}
        </p>
      </header>

      <div className="bg-parchment/60 border border-brass-deep/10 p-4">
        <p className="text-[10px] uppercase tracking-widest text-brass-deep/80 font-bold mb-2">
          Nieuwe admin toevoegen
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            placeholder="email@voorbeeld.nl"
            className="flex-1 bg-parchment border border-brass-deep/15 px-3 py-2 text-sm focus:outline-none focus:border-brass-gold"
          />
          <button
            onClick={promote}
            disabled={busy || !promoteEmail.trim()}
            className="px-4 py-2 bg-brass-deep text-parchment text-xs uppercase tracking-widest font-semibold hover:bg-brass-gold transition-colors disabled:opacity-50"
          >
            Promoot
          </button>
        </div>
        <p className="text-[11px] text-brass-deep/80 mt-2">
          De gebruiker moet al een account hebben.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, e-mail, bedrijf of anoniem ID…"
          className="flex-1 bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
        />
        <div className="flex gap-1 bg-brass-deep/10 p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-[10px] uppercase tracking-widest font-bold px-3 py-2 ${filter === k ? "bg-brass-deep text-parchment" : "text-brass-deep hover:bg-parchment"}`}
            >
              {k === "all" ? "Alle" : k === "pending" ? "Wacht" : k === "approved" ? "Goedgekeurd" : "Afgewezen"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/80">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-brass-deep/80">Geen gebruikers gevonden.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {filtered.map((u) => {
            const isMe = u.id === user?.id;
            const status = u.approval_status ?? "pending";
            return (
              <li key={u.id} className="bg-card p-4 md:p-5">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-12 md:col-span-4">
                    <p className="font-medium">
                      {u.full_name || u.email}
                      {isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-brass-gold">jij</span>}
                    </p>
                    <p className="text-xs text-brass-deep/80">{u.email}</p>
                    {u.company_name && (
                      <p className="text-xs text-brass-deep/80">{u.company_name}</p>
                    )}
                    {u.anonymous_id && (
                      <p className="text-[10px] text-brass-deep/80 mt-1 tabular-nums">#{u.anonymous_id}</p>
                    )}
                    {status === "rejected" && u.rejection_reason && (
                      <p className="text-[11px] text-red-700 mt-1">Reden: {u.rejection_reason}</p>
                    )}
                  </div>
                  <div className="col-span-6 md:col-span-2 flex flex-wrap gap-1.5 items-start">
                    <StatusChip status={status} />
                  </div>
                  <div className="col-span-6 md:col-span-2 flex flex-wrap gap-1.5 items-start">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-brass-deep/80">geen rol</span>
                    ) : (
                      u.roles.map((r) => <RoleChip key={r} role={r} />)
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-4 flex flex-wrap gap-1.5 md:justify-end">
                    {status !== "approved" && !isMe && (
                      <button
                        onClick={() => approve(u.id)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 bg-emerald-700 text-parchment hover:bg-emerald-800"
                      >
                        Goedkeuren
                      </button>
                    )}
                    {status !== "rejected" && !isMe && (
                      <button
                        onClick={() => reject(u.id)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-red-700/40 text-red-700 hover:bg-red-50"
                      >
                        Afwijzen
                      </button>
                    )}
                    <button
                      onClick={() => setRole(u.id, "opdrachtgever")}
                      className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
                    >
                      Opdrachtgever
                    </button>
                    <button
                      onClick={() => setRole(u.id, "begeleider")}
                      className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-brass-deep/20 text-brass-deep hover:bg-parchment"
                    >
                      Begeleider
                    </button>
                    {u.roles.includes("admin") && !isMe && (
                      <button
                        onClick={() => revokeAdmin(u.id)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 border border-red-700/40 text-red-700 hover:bg-red-50"
                      >
                        Admin intrekken
                      </button>
                    )}
                    {!isMe && (
                      <button
                        onClick={() => removeUser(u.id, u.full_name || u.email)}
                        className="text-[10px] uppercase tracking-widest font-semibold px-2 py-1.5 bg-red-700 text-parchment hover:bg-red-800"
                      >
                        Verwijderen
                      </button>
                    )}
                  </div>
                  <p className="col-span-12 text-[10px] text-brass-deep/80 tabular-nums">
                    Aangemaakt {fmtDate(u.created_at)}
                    {u.approved_at && status === "approved" && (
                      <> · goedgekeurd {fmtDate(u.approved_at)}</>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminUsers;
