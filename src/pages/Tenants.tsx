import { useState, useCallback } from "react";
import Topbar from "@/components/layout/Topbar";
import TenantsFilters from "@/components/tenants/TenantsFilters";
import TenantsTable from "@/components/tenants/TenantsTable";
import TenantsMobileList from "@/components/tenants/TenantsMobileList";
import TenantSheet from "@/components/tenants/TenantSheet";
import TenantActionDialogs, { type TenantDialogState } from "@/components/tenants/TenantActionDialogs";
import { Button } from "@/components/ui/button";
import { useTenantActions } from "@/hooks/useTenantActions";
import { useTenants } from "@/hooks/useTenants";
import { invokeEdgeFunction } from "@/lib/helpers";
import { toast } from "sonner";
import type { Tenant } from "@/types/tenant";
import type { TenantDialogType } from "@/components/tenants/TenantActionsMenu";

const RESEND_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export default function Tenants() {
  const t = useTenants();
  const actions = useTenantActions(t.fetchTenants);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialog, setDialog] = useState<TenantDialogState>(null);
  const [resendCooldowns, setResendCooldowns] = useState<Record<string, number>>({});

  const onAction = (type: TenantDialogType, tenant: Tenant) => setDialog({ type, tenant });

  const handleResendWelcome = useCallback(async (tenant: Tenant) => {
    try {
      await invokeEdgeFunction("send-welcome-email", { tenant_id: tenant.id, base_url: window.location.origin });
      toast.success(`Correo de bienvenida reenviado a ${tenant.owner_email}`);
      setResendCooldowns((prev) => ({ ...prev, [tenant.id]: Date.now() + RESEND_COOLDOWN_MS }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al reenviar el correo");
    }
  }, []);

  return (
    <>
      <Topbar title="Tenants" />
      <div className="p-4 sm:p-6 space-y-4 animate-fade-in">
        <TenantsFilters
          searchInput={t.searchInput}
          setSearchInput={t.setSearchInput}
          statusFilter={t.statusFilter}
          setStatusFilter={t.setStatusFilter}
          planFilter={t.planFilter}
          setPlanFilter={t.setPlanFilter}
          onboardingFilter={t.onboardingFilter}
          setOnboardingFilter={t.setOnboardingFilter}
          expiryFilter={t.expiryFilter}
          setExpiryFilter={t.setExpiryFilter}
          onCreate={() => setSheetOpen(true)}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {t.loading ? "Cargando..." : (
              <>
                Mostrando <span className="font-semibold text-foreground">{t.filtered.length}</span> de{" "}
                <span className="font-semibold text-foreground">{t.tenants.length}</span> tenants
                {t.hasActiveFilters && " (filtrados)"}
              </>
            )}
          </span>
          {t.hasActiveFilters && (
            <button type="button" onClick={t.clearFilters} className="text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>

        <TenantsMobileList loading={t.loading} tenants={t.paged} onAction={onAction} resendCooldowns={resendCooldowns} onResendWelcome={handleResendWelcome} />
        <TenantsTable
          loading={t.loading}
          tenants={t.paged}
          sortKey={t.sortKey}
          sortDir={t.sortDir}
          toggleSort={t.toggleSort}
          onAction={onAction}
          resendCooldowns={resendCooldowns}
          onResendWelcome={handleResendWelcome}
        />

        {t.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={t.page === 0} onClick={() => t.setPage(t.page - 1)}>Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {t.page + 1} de {t.totalPages}</span>
            <Button variant="outline" size="sm" disabled={t.page >= t.totalPages - 1} onClick={() => t.setPage(t.page + 1)}>Siguiente</Button>
          </div>
        )}
      </div>

      <TenantSheet open={sheetOpen} onOpenChange={setSheetOpen} onCreated={t.fetchTenants} />
      <TenantActionDialogs dialog={dialog} setDialog={setDialog} actions={actions} />
    </>
  );
}
