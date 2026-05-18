import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CompanyRole = "planner" | "driver" | null;

export interface CompanyContext {
  loading: boolean;
  companyId: string | null;
  companyRole: CompanyRole;
  isPlanner: boolean;
  isDriver: boolean;
  refresh: () => Promise<void>;
}

export function useCompany(): CompanyContext {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyRole, setCompanyRole] = useState<CompanyRole>(null);

  const load = async () => {
    if (!user) {
      setCompanyId(null);
      setCompanyRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    setCompanyId((data as any)?.company_id ?? null);
    setCompanyRole(((data as any)?.role as CompanyRole) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return {
    loading,
    companyId,
    companyRole,
    isPlanner: companyRole === "planner",
    isDriver: companyRole === "driver",
    refresh: load,
  };
}
