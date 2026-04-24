import { cn } from "@/lib/utils";
import type { TenantPlan } from "@/types/tenant";

const planConfig: Record<TenantPlan, { label: string; className: string }> = {
  basic: { label: "Basic", className: "bg-muted text-muted-foreground" },
  pro: { label: "Pro", className: "bg-info/10 text-info border-info/20 border" },
  enterprise: { label: "Enterprise", className: "bg-primary/10 text-primary border-primary/20 border" },
};

export default function PlanBadge({ plan }: { plan: string }) {
  const config = planConfig[plan as TenantPlan] ?? planConfig.basic;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}
