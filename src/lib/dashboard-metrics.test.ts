import { describe, it, expect } from "vitest";
import { computeDashboardMetrics } from "@/lib/dashboard-metrics";
import type { Tenant } from "@/types/tenant";

const NOW = new Date("2026-04-15T12:00:00Z");

function tenant(over: Partial<Tenant>): Tenant {
  return {
    id: crypto.randomUUID(),
    owner_email: "x@y.com",
    owner_name: null,
    tenant_token: "tok",
    plan: "basic",
    status: "active",
    credits_assigned: 0,
    expires_at: new Date("2027-01-01T00:00:00Z").toISOString(),
    created_at: new Date("2026-04-01T00:00:00Z").toISOString(),
    updated_at: null,
    panel_version: "latest",
    notes: null,
    onboarding_step: 0,
    onboarding_done: false,
    supabase_connected: false,
    supabase_project_id: null,
    supabase_project_name: null,
    supabase_region: null,
    supabase_db_url: null,
    deploy_platform: null,
    deploy_connected: false,
    deploy_account_id: null,
    deploy_account_name: null,
    deploy_project_id: null,
    deploy_project_name: null,
    deploy_url: null,
    custom_domain: null,
    ...over,
  } as Tenant;
}

describe("computeDashboardMetrics", () => {
  it("counts totals by status", () => {
    const m = computeDashboardMetrics([
      tenant({ status: "active" }),
      tenant({ status: "active" }),
      tenant({ status: "suspended" }),
      tenant({ status: "expired" }),
    ], NOW);
    expect(m.total).toBe(4);
    expect(m.active).toBe(2);
    expect(m.suspended).toBe(1);
    expect(m.expired).toBe(1);
  });

  it("buckets expirations 7 and 30 days only for active", () => {
    const in3d = new Date(NOW.getTime() + 3 * 86400000).toISOString();
    const in15d = new Date(NOW.getTime() + 15 * 86400000).toISOString();
    const in60d = new Date(NOW.getTime() + 60 * 86400000).toISOString();
    const m = computeDashboardMetrics([
      tenant({ status: "active", expires_at: in3d }),
      tenant({ status: "active", expires_at: in15d }),
      tenant({ status: "active", expires_at: in60d }),
      tenant({ status: "suspended", expires_at: in3d }),
    ], NOW);
    expect(m.expiring7).toBe(1);
    expect(m.expiring30).toBe(2);
  });

  it("computes onboarding pct", () => {
    const m = computeDashboardMetrics([
      tenant({ onboarding_done: true }),
      tenant({ onboarding_done: true }),
      tenant({ onboarding_done: false }),
      tenant({ onboarding_done: false }),
    ], NOW);
    expect(m.onboardingDone).toBe(2);
    expect(m.onboardingPending).toBe(2);
    expect(m.onboardingPct).toBe(50);
  });

  it("returns 0% onboarding when no tenants", () => {
    const m = computeDashboardMetrics([], NOW);
    expect(m.onboardingPct).toBe(0);
  });

  it("MRR sums only active tenants", () => {
    const m = computeDashboardMetrics([
      tenant({ status: "active", plan: "basic" }),       // 29
      tenant({ status: "active", plan: "pro" }),         // 79
      tenant({ status: "active", plan: "enterprise" }),  // 199
      tenant({ status: "suspended", plan: "enterprise" }), // ignored
    ], NOW);
    expect(m.mrr).toBe(29 + 79 + 199);
    expect(m.arr).toBe((29 + 79 + 199) * 12);
  });

  it("plan distribution counts include non-active", () => {
    const m = computeDashboardMetrics([
      tenant({ plan: "basic" }),
      tenant({ plan: "basic" }),
      tenant({ plan: "pro" }),
    ], NOW);
    expect(m.planData.find((p) => p.plan === "basic")?.count).toBe(2);
    expect(m.planData.find((p) => p.plan === "pro")?.count).toBe(1);
    expect(m.planData.find((p) => p.plan === "enterprise")?.count).toBe(0);
  });

  it("expiringList limited to 5 active in next 7d, sorted", () => {
    const list = Array.from({ length: 8 }, (_, i) =>
      tenant({ status: "active", expires_at: new Date(NOW.getTime() + (i + 1) * 86400000).toISOString() })
    );
    const m = computeDashboardMetrics(list, NOW);
    expect(m.expiringList).toHaveLength(5);
    const dates = m.expiringList.map((t) => new Date(t.expires_at).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => a - b));
  });
});
