import { useEffect, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const fmtDate = (d: string) => {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const statusBadge = (status: AdminUser["approval_status"]) => {
  const s = status ?? "pending";
  switch (s) {
    case "approved":
      return { className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200", label: "Goedgekeurd" };
    case "rejected":
      return { className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200", label: "Afgewezen" };
    default:
      return { className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200", label: "In afwachting" };
  }
};

const roleBadge = (role: string) => {
  switch (role) {
    case "admin":
      return { className: "bg-brass-gold text-brass-deep", label: "Admin" };
    case "opdrachtgever":
      return { className: "bg-patina text-brass-deep", label: "Opdrachtgever" };
    case "begeleider":
      return { className: "bg-brass-deep/10 text-brass-deep", label: "Begeleider" };
    default:
      return { className: "bg-muted text-muted-foreground", label: role };
  }
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
    <div className="space-y-4">
      <header>
        <h2 className="font-display text-2xl text-brass-deep">Gebruikers &amp; rollen</h2>
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
          <Input
            type="email"
            value={promoteEmail}
            onChange={(e) => setPromoteEmail(e.target.value)}
            placeholder="email@voorbeeld.nl"
            className="flex-1 h-9"
          />
          <Button
            onClick={promote}
            disabled={busy || !promoteEmail.trim()}
            size="sm"
            className="h-9 bg-brass-deep text-parchment hover:bg-brass-gold"
          >
            Promoot
          </Button>
        </div>
        <p className="text-[11px] text-brass-deep/80 mt-2">
          De gebruiker moet al een account hebben.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="pending">In afwachting</SelectItem>
            <SelectItem value="approved">Goedgekeurd</SelectItem>
            <SelectItem value="rejected">Afgewezen</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam, e-mail, bedrijf of anoniem ID…"
          className="flex-1 min-w-[240px] h-9"
        />
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Naam</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Bedrijf</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Anoniem ID</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Aangemaakt</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
              <TableHead className="h-9 text-[11px] uppercase tracking-wider font-semibold">Rollen</TableHead>
              <TableHead className="h-9 w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Laden…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Geen gebruikers gevonden.</TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isMe = u.id === user?.id;
                const sb = statusBadge(u.approval_status);
                return (
                  <TableRow key={u.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs py-2 max-w-[200px]">
                      <p className="font-medium truncate">
                        {u.full_name || u.email}
                        {isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-brass-gold">jij</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    </TableCell>
                    <TableCell className="text-xs py-2 max-w-[160px] truncate">{u.company_name ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono tabular-nums py-2">{u.anonymous_id ? `#${u.anonymous_id}` : "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums py-2 whitespace-nowrap">{fmtDate(u.created_at)}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold uppercase ${sb.className}`}>
                        {sb.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">geen rol</span>
                        ) : (
                          u.roles.map((r) => {
                            const rb = roleBadge(r);
                            return (
                              <span key={r} className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 ${rb.className}`}>
                                {rb.label}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Meer opties</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs">{u.full_name || u.email}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {u.approval_status !== "approved" && !isMe && (
                            <DropdownMenuItem className="text-xs" onClick={() => approve(u.id)}>Goedkeuren</DropdownMenuItem>
                          )}
                          {u.approval_status !== "rejected" && !isMe && (
                            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => reject(u.id)}>Afwijzen</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-xs" onClick={() => setRole(u.id, "opdrachtgever")}>Rol: Opdrachtgever</DropdownMenuItem>
                          <DropdownMenuItem className="text-xs" onClick={() => setRole(u.id, "begeleider")}>Rol: Begeleider</DropdownMenuItem>
                          {u.roles.includes("admin") && !isMe && (
                            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => revokeAdmin(u.id)}>Admin intrekken</DropdownMenuItem>
                          )}
                          {!isMe && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => removeUser(u.id, u.full_name || u.email)}>Verwijderen</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminUsers;
