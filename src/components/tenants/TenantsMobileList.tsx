import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Tenant } from "@/types/tenant";
import StatusBadge from "@/components/tenants/StatusBadge";
import PlanBadge from "@/components/tenants/PlanBadge";
import ExpiryBadge from "@/components/tenants/ExpiryBadge";
import OnboardingProgress from "@/components/tenants/OnboardingProgress";
import TenantActionsMenu, { type TenantDialogType } from "@/components/tenants/TenantActionsMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  tenants: Tenant[];
  onAction: (type: TenantDialogType, tenant: Tenant) => void;
  resendCooldowns: Record<string, number>;
  onResendWelcome: (tenant: Tenant) => void;
}

export default function TenantsMobileList({ loading, tenants, onAction, resendCooldowns, onResendWelcome }: Props) {
  if (loading) {
    return (
      <div className="md:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }
  if (tenants.length === 0) {
    return (
      <div className="md:hidden rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
        No hay tenants que coincidan.
      </div>
    );
  }
  return (
    <div className="md:hidden space-y-3">
      {tenants.map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-3 animate-fade-in transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">{t.owner_email}</div>
              {t.owner_name && <div className="truncate text-xs text-muted-foreground">{t.owner_name}</div>}
            </div>
            <TenantActionsMenu tenant={t} onAction={onAction} resendCooldownUntil={resendCooldowns[t.id]} onResendWelcome={() => onResendWelcome(t)} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <PlanBadge plan={t.plan} />
            <StatusBadge status={t.status} />
            <ExpiryBadge expiresAt={t.expires_at} />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t.supabase_connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
              Supabase: {t.supabase_connected ? "OK" : "—"}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t.deploy_connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
              Deploy: {t.deploy_connected ? (t.deploy_platform ?? "OK") : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Expira</div>
              <div className="text-sm text-foreground">{format(new Date(t.expires_at), "d MMM yyyy", { locale: es })}</div>
            </div>
            <OnboardingProgress step={t.onboarding_step ?? 0} done={!!t.onboarding_done} />
          </div>
        </div>
      ))}
    </div>
  );
}
