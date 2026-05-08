import { cn } from "@/lib/utils";
import type { TenantStatus } from "@/types/tenant";

const statusConfig: Record<TenantStatus, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-success/10 text-success border-success/20" },
  suspended: { label: "Suspendido", className: "bg-warning/10 text-warning border-warning/20" },
  expired: { label: "Expirado", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as TenantStatus] ?? statusConfig.expired;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
