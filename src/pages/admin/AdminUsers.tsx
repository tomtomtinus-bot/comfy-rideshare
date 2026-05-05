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

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");
  const [busy, setBusy] = useState(false);

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

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.company_name ?? "").toLowerCase().includes(q) ||
      (u.anonymous_id ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Gebruikers & rollen</h2>
        <p className="text-sm text-brass-deep/60 mt-1">
          {users.length} geregistreerde gebruiker{users.length === 1 ? "" : "s"}.
        </p>
      </header>

      <div className="bg-parchment/60 border border-brass-deep/10 p-4">
        <p className="text-[10px] uppercase tracking-widest text-brass-deep/55 font-bold mb-2">
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
        <p className="text-[11px] text-brass-deep/50 mt-2">
          De gebruiker moet al een account hebben.
        </p>
      </div>

      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, e-mail, bedrijf of anoniem ID…"
          className="w-full bg-parchment border border-brass-deep/15 px-4 py-3 text-sm focus:outline-none focus:border-brass-gold"
        />
      </div>

      {loading ? (
        <p className="text-sm text-brass-deep/50">Laden…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-brass-deep/50">Geen gebruikers gevonden.</p>
      ) : (
        <ul className="space-y-px bg-brass-deep/10">
          {filtered.map((u) => {
            const isMe = u.id === user?.id;
            return (
              <li key={u.id} className="bg-card p-4 md:p-5">
                <div className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-12 md:col-span-5">
                    <p className="font-medium">
                      {u.full_name || u.email}
                      {isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-brass-gold">jij</span>}
                    </p>
                    <p className="text-xs text-brass-deep/55">{u.email}</p>
                    {u.company_name && (
                      <p className="text-xs text-brass-deep/55">{u.company_name}</p>
                    )}
                    {u.anonymous_id && (
                      <p className="text-[10px] text-brass-deep/40 mt-1 tabular-nums">#{u.anonymous_id}</p>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-3 flex flex-wrap gap-1.5 items-start">
                    {u.roles.length === 0 ? (
                      <span className="text-xs text-brass-deep/40">geen rol</span>
                    ) : (
                      u.roles.map((r) => <RoleChip key={r} role={r} />)
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-4 flex flex-wrap gap-1.5 md:justify-end">
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
                  </div>
                  <p className="col-span-12 text-[10px] text-brass-deep/40 tabular-nums">
                    Aangemaakt {fmtDate(u.created_at)}
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
