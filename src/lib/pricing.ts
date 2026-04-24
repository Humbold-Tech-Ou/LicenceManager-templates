import type { TenantPlan } from "@/types/tenant";

// Precio mensual estimado por plan (USD). Ajustar según pricing real.
export const PLAN_PRICES: Record<TenantPlan, number> = {
  basic: 29,
  pro: 79,
  enterprise: 199,
};

export const planPrice = (plan: string): number =>
  PLAN_PRICES[plan as TenantPlan] ?? 0;

export const formatUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
