import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, LicenseEvent } from "@/types/tenant";
import { computeDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard-metrics";

export interface EventWithTenant extends LicenseEvent {
  tenant?: Pick<Tenant, "id" | "owner_email">;
}

export interface DashboardData {
  loading: boolean;
  metrics: DashboardMetrics;
  events: EventWithTenant[];
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [events, setEvents] = useState<EventWithTenant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tRes, eRes] = await Promise.all([
      supabase.from("tenants").select("*"),
      supabase
        .from("license_events")
        .select("*, tenant:tenants(id, owner_email)")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setTenants(tRes.data ?? []);
    setEvents((eRes.data ?? []) as EventWithTenant[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const metrics = useMemo(() => computeDashboardMetrics(tenants), [tenants]);

  return { loading, metrics, events, refresh };
}
