import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const [aalChecked, setAalChecked] = useState(false);
  const [aalOk, setAalOk] = useState(false);
  const [hasFactor, setHasFactor] = useState(false);

  useEffect(() => {
    if (!user || !isAdmin) return;
    (async () => {
      const { data: a } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const { data: list } = await supabase.auth.mfa.listFactors();
      const verified = (list?.totp ?? []).some((f: any) => f.status === "verified");
      setHasFactor(verified);
      setAalOk(a?.currentLevel === "aal2");
      setAalChecked(true);
    })();
  }, [user, isAdmin]);

  if (loading || (isAdmin && !aalChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brass-deep/50 text-sm uppercase tracking-widest">
        Laden…
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (!aalOk) {
    // Force MFA setup or challenge
    return <Navigate to={`/beveiliging?forced=1${hasFactor ? "" : ""}`} replace />;
  }
  return <>{children}</>;
};
