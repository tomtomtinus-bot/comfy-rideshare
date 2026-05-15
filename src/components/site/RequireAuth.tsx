import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, roles, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-brass-deep/50 text-sm uppercase tracking-widest">
        Laden…
      </div>
    );
  }
  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (roles.length === 0 && location.pathname !== "/kies-rol") {
    return <Navigate to="/kies-rol" replace />;
  }
  return <>{children}</>;
};
