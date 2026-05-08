import { differenceInDays, subMonths, startOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Tenant } from "@/types/tenant";
import { planPrice } from "@/lib/pricing";

export interface DashboardMetrics {
  total: number;
  active: number;
  suspended: number;
  expired: number;
  expiring7: number;
  expiring30: number;
  onboardingPending: number;
  onboardingDone: number;
  onboardingPct: number;
  mrr: number;
  arr: number;
  planData: { name: string; plan: string; count: number }[];
  chartData: { name: string; count: number }[];
  expiringList: Tenant[];
}

export function computeDashboardMetrics(tenants: Tenant[], now: Date = new Date()): DashboardMetrics {
  const total = tenants.length;
  const active = tenants.filter((t) => t.status === "active").length;
  const suspended = tenants.filter((t) => t.status === "suspended").length;
  const expired = tenants.filter((t) => t.status === "expired").length;

  const expiring7 = tenants.filter((t) => {
    if (t.status !== "active") return false;
    const d = differenceInDays(new Date(t.expires_at), now);
    return d >= 0 && d <= 7;
  }).length;

  const expiring30 = tenants.filter((t) => {
    if (t.status !== "active") return false;
    const d = differenceInDays(new Date(t.expires_at), now);
    return d >= 0 && d <= 30;
  }).length;

  const onboardingPending = tenants.filter((t) => !t.onboarding_done).length;
  const onboardingDone = tenants.filter((t) => t.onboarding_done).length;
  const onboardingPct = total > 0 ? Math.round((onboardingDone / total) * 100) : 0;

  const mrr = tenants
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + planPrice(t.plan), 0);

  const planData = ["basic", "pro", "enterprise"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    plan: p,
    count: tenants.filter((t) => t.plan === p).length,
  }));

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(now, 5 - i);
    const start = startOfMonth(month);
    const end = startOfMonth(subMonths(now, 4 - i));
    const count = tenants.filter((t) => {
      if (!t.created_at) return false;
      const d = new Date(t.created_at);
      return d >= start && (i < 5 ? d < end : true);
    }).length;
    return { name: format(month, "MMM", { locale: es }), count };
  });

  const expiringList = tenants
    .filter((t) => t.status === "active" && differenceInDays(new Date(t.expires_at), now) <= 7 && new Date(t.expires_at) > now)
    .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
    .slice(0, 5);

  return {
    total, active, suspended, expired,
    expiring7, expiring30,
    onboardingPending, onboardingDone, onboardingPct,
    mrr, arr: mrr * 12,
    planData, chartData, expiringList,
  };
}

export const PLAN_CHART_COLORS: Record<string, string> = {
  basic: "hsl(var(--muted-foreground))",
  pro: "hsl(var(--primary))",
  enterprise: "hsl(var(--success))",
};
