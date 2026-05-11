import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "opdrachtgever" | "begeleider" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** Primary role used to render the dashboard. Admins keep their opdrachtgever/begeleider role here. */
  role: AppRole | null;
  /** All roles the user has. */
  roles: AppRole[];
  isAdmin: boolean;
  /** Account approval status (admins are always approved). */
  approvalStatus: ApprovalStatus;
  isApproved: boolean;
  rejectionReason: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  roles: [],
  isAdmin: false,
  approvalStatus: "pending",
  isApproved: false,
  rejectionReason: null,
  loading: true,
  signOut: async () => {},
  refreshApproval: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("pending");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // "Blijf ingelogd" handling: if user opted out, sign them out at the start
    // of every new browser session (sessionStorage is cleared on tab/browser close).
    // Skip on the password-reset route — opening the recovery link in a new tab
    // would otherwise destroy the recovery session before the user can set a new password.
    try {
      const path = window.location.pathname;
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const isRecoveryFlow =
        path.startsWith("/reset-password") ||
        hash.includes("type=recovery") ||
        hash.includes("access_token=") ||
        search.includes("code=") ||
        search.includes("type=recovery") ||
        search.includes("token_hash=");
      const remember = localStorage.getItem("viacust_remember");
      const sessionMarker = sessionStorage.getItem("viacust_session_active");
      if (!isRecoveryFlow && remember === "false" && !sessionMarker) {
        supabase.auth.signOut();
      }
      sessionStorage.setItem("viacust_session_active", "1");
    } catch {
      // ignore storage errors (e.g. private mode)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) setLoading(false);
      if (s?.user) {
        setTimeout(() => {
          fetchRole(s.user.id);
          fetchApproval(s.user.id);
        }, 0);
      } else {
        setRole(null);
        setRoles([]);
        setApprovalStatus("pending");
        setRejectionReason(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRole(data.session.user.id);
        fetchApproval(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchRole = async (uid: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const all = ((data ?? []).map((r: any) => r.role)) as AppRole[];
    setRoles(all);
    const primary = all.find((r) => r !== "admin") ?? all[0] ?? null;
    setRole(primary);
  };

  const fetchApproval = async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("approval_status, rejection_reason")
      .eq("id", uid)
      .maybeSingle();
    if (data) {
      setApprovalStatus(((data as any).approval_status ?? "pending") as ApprovalStatus);
      setRejectionReason(((data as any).rejection_reason ?? null) as string | null);
    }
  };

  const refreshApproval = async () => {
    if (user) await fetchApproval(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setRoles([]);
    setApprovalStatus("pending");
    setRejectionReason(null);
  };

  const isAdmin = roles.includes("admin");
  const isApproved = isAdmin || approvalStatus === "approved";

  return (
    <AuthContext.Provider value={{ user, session, role, roles, isAdmin, approvalStatus, isApproved, rejectionReason, loading, signOut, refreshApproval }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
