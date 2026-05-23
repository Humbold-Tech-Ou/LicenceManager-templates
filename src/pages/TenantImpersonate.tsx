import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/types/tenant";
import { PreviewProvider } from "@/owner/preview/PreviewProvider";
import {
  CascadingImpersonationProvider,
  useCascadingImpersonation,
} from "@/hooks/useOwnerPanel";
import OwnerLayout from "@/owner/OwnerLayout";
import OwnerDashboard from "@/owner/Dashboard";
import OwnerResellers from "@/owner/Resellers";
import OwnerLines from "@/owner/Lines";
import OwnerPackages from "@/owner/Packages";
import OwnerServers from "@/owner/Servers";
import OwnerStreams from "@/owner/Streams";
import OwnerSettings from "@/owner/Settings";
import OwnerVOD from "@/owner/VOD";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, ExternalLink, Eye, MonitorSmartphone, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Tenant impersonation bar (violet) ─────────────────────────────────────────

function ImpersonationBar({ tenant, onExit }: { tenant: Tenant; onExit: () => void }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 bg-violet-700 px-4 py-2 text-white shadow-lg">
      <div className="flex items-center gap-3 min-w-0">
        <Eye className="size-4 shrink-0 opacity-80" />
        <div className="min-w-0">
          <span className="text-[11px] font-medium opacity-70 uppercase tracking-wide mr-2">Simulación · como tenant</span>
          <span className="text-sm font-semibold truncate">{tenant.owner_email}</span>
          {tenant.owner_name && (
            <span className="ml-1.5 text-[11px] opacity-70 hidden sm:inline">({tenant.owner_name})</span>
          )}
        </div>
        <span className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border",
          tenant.status === "active"
            ? "bg-green-500/20 border-green-400/30 text-green-100"
            : "bg-red-500/20 border-red-400/30 text-red-100"
        )}>
          {tenant.plan.toUpperCase()} · {tenant.status === "active" ? "Activo" : tenant.status}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {tenant.deploy_url && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => window.open(tenant.deploy_url!, "_blank")}
          >
            <MonitorSmartphone className="size-3.5" />
            <span className="hidden sm:inline">Panel en vivo</span>
            <ExternalLink className="size-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10"
          onClick={onExit}
        >
          <ArrowLeft className="size-3.5" />
          Salir
        </Button>
      </div>
    </div>
  );
}

// ── Reseller cascading impersonation bar (amber) ─────────────────────────────

function ResellerImpersonationBar() {
  const { impersonatedReseller, setImpersonatedReseller } = useCascadingImpersonation();
  if (!impersonatedReseller) return null;

  const r = impersonatedReseller;
  const available = r.credits_total - r.credits_used;

  return (
    <div className="fixed top-[40px] left-0 right-0 z-[9998] flex items-center justify-between gap-3 bg-amber-600 px-4 py-1.5 text-white shadow-md">
      <div className="flex items-center gap-3 min-w-0">
        <UserCheck className="size-3.5 shrink-0 opacity-80" />
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-[11px] font-medium opacity-70 uppercase tracking-wide">Viendo como</span>
          <span className="text-sm font-semibold truncate">{r.name}</span>
          <span className="text-[10px] opacity-70">({r.email})</span>
          <span className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium border",
            r.role === "reseller"
              ? "bg-blue-500/20 border-blue-400/30 text-blue-100"
              : "bg-zinc-500/20 border-zinc-400/30 text-zinc-100"
          )}>
            {r.role === "reseller" ? "Reseller" : "Sub"}
          </span>
          <span className="text-[10px] opacity-70 hidden sm:inline">
            · {available} / {r.credits_total} cr.
          </span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-6 gap-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 shrink-0"
        onClick={() => setImpersonatedReseller(null)}
      >
        <ArrowLeft className="size-3" />
        Volver a dueño
      </Button>
    </div>
  );
}

// ── Inner panel with offset for bars ─────────────────────────────────────────

function ImpersonatePanelInner({ basePath }: { basePath: string }) {
  const { impersonatedReseller } = useCascadingImpersonation();
  // Extra padding when reseller bar is visible (40px tenant bar + 32px reseller bar)
  const topPadding = impersonatedReseller ? "72px" : "40px";

  return (
    <div style={{ paddingTop: topPadding }}>
      <Routes>
        <Route path="/" element={<OwnerLayout />}>
          <Route index element={<Navigate to={`${basePath}/dashboard`} replace />} />
          <Route path="dashboard"  element={<OwnerDashboard />} />
          <Route path="resellers"  element={<OwnerResellers />} />
          <Route path="lines"      element={<OwnerLines />} />
          <Route path="packages"   element={<OwnerPackages />} />
          <Route path="servers"    element={<OwnerServers />} />
          <Route path="streams"    element={<OwnerStreams />} />
          <Route path="vod"        element={<OwnerVOD />} />
          <Route path="settings"   element={<OwnerSettings />} />
        </Route>
      </Routes>
    </div>
  );
}

function ImpersonatePanel({ basePath }: { basePath: string }) {
  return (
    <PreviewProvider>
      <CascadingImpersonationProvider>
        <ResellerImpersonationBar />
        <ImpersonatePanelInner basePath={basePath} />
      </CascadingImpersonationProvider>
    </PreviewProvider>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TenantImpersonate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("tenants")
      .select("id, owner_email, owner_name, plan, status, deploy_url, custom_domain, credits_assigned, expires_at, tenant_token, deploy_connected, supabase_connected, onboarding_step, onboarding_done, supabase_project_id, supabase_project_name, supabase_region, deploy_platform, deploy_project_id, deploy_project_name, panel_version, max_reseller_depth, created_at, updated_at" as any)
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setTenant(data as unknown as Tenant);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Tenant no encontrado</p>
          <Button variant="outline" onClick={() => navigate("/tenants")}>Volver a tenants</Button>
        </div>
      </div>
    );
  }

  const basePath = `/tenants/${id}/impersonate`;

  // Redirect root to dashboard sub-path
  const isRoot = location.pathname === basePath || location.pathname === `${basePath}/`;

  return (
    <>
      <ImpersonationBar tenant={tenant} onExit={() => navigate(`/tenants/${id}`)} />
      {isRoot ? (
        <Navigate to={`${basePath}/dashboard`} replace />
      ) : (
        <ImpersonatePanel basePath={basePath} />
      )}
    </>
  );
}
