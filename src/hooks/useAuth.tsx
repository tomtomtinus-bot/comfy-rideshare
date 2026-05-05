import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "opdrachtgever" | "begeleider" | "admin";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** Primary role used to render the dashboard. Admins keep their opdrachtgever/begeleider role here. */
  role: AppRole | null;
  /** All roles the user has. */
  roles: AppRole[];
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  roles: [],
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer role fetch to avoid deadlock
        setTimeout(() => fetchRole(s.user.id), 0);
      } else {
        setRole(null);
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) fetchRole(data.session.user.id);
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
    // Primary role = first non-admin role, fall back to admin
    const primary = all.find((r) => r !== "admin") ?? all[0] ?? null;
    setRole(primary);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setRoles([]);
  };

  const isAdmin = roles.includes("admin");

  return (
    <AuthContext.Provider value={{ user, session, role, roles, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
