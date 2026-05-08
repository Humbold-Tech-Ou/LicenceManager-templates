import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Tenant } from "@/types/tenant";

interface AuthCtx {
  user: User | null;
  tenant: Tenant | null;
  role: "superadmin" | "tenant" | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({ user: null, tenant: null, role: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<"superadmin" | "tenant" | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveRole = async (u: User | null) => {
    if (!u) {
      setTenant(null);
      setRole(null);
      setLoading(false);
      return;
    }
    // Server-validated role: query user_roles table (RLS-protected by has_role)
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", u.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleRow) {
      setTenant(null);
      setRole("superadmin");
    } else {
      // Use the safe RPC that excludes infrastructure credentials
      // (supabase_db_url, project IDs, account IDs, etc.)
      const rpcRes = await supabase.rpc("get_my_tenant" as never);
      const tenantRows = (rpcRes.data ?? []) as unknown as Tenant[];
      const tenantRow = tenantRows.length > 0 ? tenantRows[0] : null;
      if (tenantRow) {
        setTenant(tenantRow as Tenant);
        setRole("tenant");
      } else {
        setTenant(null);
        setRole(null);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      resolveRole(u);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      resolveRole(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTenant(null);
    setRole(null);
  };

  return <AuthContext.Provider value={{ user, tenant, role, loading, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
