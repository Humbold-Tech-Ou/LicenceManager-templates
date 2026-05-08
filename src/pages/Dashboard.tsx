import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Topbar from "@/components/layout/Topbar";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import SecondaryMetrics from "@/components/dashboard/SecondaryMetrics";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import ExpiringTable from "@/components/dashboard/ExpiringTable";
import RecentEvents from "@/components/dashboard/RecentEvents";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const { loading, metrics, events, refresh } = useDashboardData();

  const renewTenant = useCallback(async (id: string) => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 30);
    const { error } = await supabase
      .from("tenants")
      .update({ expires_at: newDate.toISOString(), status: "active" })
      .eq("id", id);
    if (error) { toast.error("Error al renovar"); return; }
    await supabase.from("license_events").insert({ tenant_id: id, event_type: "renewed", metadata: { days: 30 } });
    toast.success("Renovado 30 días");
    refresh();
  }, [refresh]);

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
        <MetricsGrid
          loading={loading}
          total={metrics.total}
          active={metrics.active}
          suspended={metrics.suspended}
          expired={metrics.expired}
        />
        <SecondaryMetrics
          loading={loading}
          expiring7={metrics.expiring7}
          expiring30={metrics.expiring30}
          onboardingPending={metrics.onboardingPending}
          onboardingPct={metrics.onboardingPct}
          active={metrics.active}
          mrr={metrics.mrr}
          arr={metrics.arr}
        />
        <DashboardCharts loading={loading} chartData={metrics.chartData} planData={metrics.planData} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ExpiringTable loading={loading} list={metrics.expiringList} onRenew={renewTenant} />
          <RecentEvents loading={loading} events={events} />
        </div>
      </div>
    </>
  );
}
