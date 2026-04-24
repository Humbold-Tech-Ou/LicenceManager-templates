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
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import type { SortKey, SortDir } from "@/hooks/useTenants";

interface Props {
  loading: boolean;
  tenants: Tenant[];
  sortKey: SortKey;
  sortDir: SortDir;
  toggleSort: (k: SortKey) => void;
  onAction: (type: TenantDialogType, tenant: Tenant) => void;
  resendCooldowns: Record<string, number>;
  onResendWelcome: (tenant: Tenant) => void;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
}

export default function TenantsTable({ loading, tenants, sortKey, sortDir, toggleSort, onAction, resendCooldowns, onResendWelcome }: Props) {
  const SortableTh = ({ k, label }: { k: SortKey; label: string }) => (
    <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        {label}
        <SortIcon active={sortKey === k} dir={sortDir} />
      </button>
    </th>
  );

  return (
    <div className="hidden md:block rounded-xl border border-border bg-card overflow-x-auto animate-fade-in">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="bg-muted/50">
            <SortableTh k="owner_email" label="Email" />
            <SortableTh k="plan" label="Plan" />
            <SortableTh k="status" label="Status" />
            <SortableTh k="expires_at" label="Expira" />
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Supabase</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deploy</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Onboarding</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {loading ? Array.from({ length: 5 }).map((_, i) => (
            <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
          )) : tenants.length === 0 ? (
            <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No hay tenants que coincidan.</td></tr>
          ) : tenants.map((t) => (
            <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-2.5">
                <div className="text-foreground font-medium">{t.owner_email}</div>
                {t.owner_name && <div className="text-xs text-muted-foreground">{t.owner_name}</div>}
              </td>
              <td className="px-4 py-2.5"><PlanBadge plan={t.plan} /></td>
              <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
              <td className="px-4 py-2.5">
                <div className="text-foreground text-xs">{format(new Date(t.expires_at), "d MMM yyyy", { locale: es })}</div>
                <ExpiryBadge expiresAt={t.expires_at} className="mt-1" />
              </td>
              <td className="px-4 py-2.5">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t.supabase_connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                  {t.supabase_connected ? "Conectado" : "Pendiente"}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t.deploy_connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                  {t.deploy_connected ? (t.deploy_platform ?? "Conectado") : "Pendiente"}
                </span>
              </td>
              <td className="px-4 py-2.5"><OnboardingProgress step={t.onboarding_step ?? 0} done={!!t.onboarding_done} /></td>
              <td className="px-4 py-2.5 text-right">
                <TenantActionsMenu tenant={t} onAction={onAction} resendCooldownUntil={resendCooldowns[t.id]} onResendWelcome={() => onResendWelcome(t)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
