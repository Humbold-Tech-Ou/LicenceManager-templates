import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunction } from "@/lib/helpers";
import type { TenantPlan } from "@/types/tenant";
import type { TenantEventType } from "@/lib/events";

async function logEvent(tenant_id: string, event_type: TenantEventType, metadata: Record<string, unknown> = {}) {
  await supabase.from("license_events").insert([{ tenant_id, event_type, metadata: metadata as never }]);
}

export function useTenantActions(onChange?: () => void) {
  const [busy, setBusy] = useState(false);

  const wrap = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      onChange?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Error: ${label}`;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    suspend: (id: string, reason?: string) =>
      wrap("suspender", async () => {
        const { error } = await supabase.from("tenants").update({ status: "suspended" }).eq("id", id);
        if (error) throw error;
        await logEvent(id, "suspended", reason ? { reason } : {});
        toast.success("Tenant suspendido");
      }),

    reactivate: (id: string) =>
      wrap("reactivar", async () => {
        const { error } = await supabase.from("tenants").update({ status: "active" }).eq("id", id);
        if (error) throw error;
        await logEvent(id, "reactivated");
        toast.success("Tenant reactivado");
      }),

    renew: (id: string, currentExpiresAt: string, days: number | Date) =>
      wrap("renovar", async () => {
        let nextDate: Date;
        let metaDays: number | null = null;
        if (days instanceof Date) {
          nextDate = days;
        } else {
          const base = new Date(currentExpiresAt);
          const from = base.getTime() > Date.now() ? base : new Date();
          nextDate = new Date(from);
          nextDate.setDate(nextDate.getDate() + days);
          metaDays = days;
        }
        const { error } = await supabase
          .from("tenants")
          .update({ expires_at: nextDate.toISOString(), status: "active" })
          .eq("id", id);
        if (error) throw error;
        await logEvent(id, "renewed", metaDays ? { days: metaDays } : { custom_date: nextDate.toISOString() });
        toast.success(metaDays ? `Renovado ${metaDays} días` : "Renovado a fecha custom");
      }),

    updatePlan: (id: string, plan: TenantPlan, previous: TenantPlan) =>
      wrap("cambiar plan", async () => {
        if (plan === previous) return;
        const { error } = await supabase.from("tenants").update({ plan }).eq("id", id);
        if (error) throw error;
        await logEvent(id, "plan_changed", { from: previous, to: plan });
        toast.success(`Plan actualizado a ${plan}`);
      }),

    adjustCredits: (id: string, delta: number, mode: "set" | "add" | "subtract", current: number) =>
      wrap("ajustar créditos", async () => {
        let next: number;
        if (mode === "set") next = delta;
        else if (mode === "add") next = current + delta;
        else next = current - delta;
        if (next < 0) throw new Error("Los créditos no pueden ser negativos");
        const { error } = await supabase.from("tenants").update({ credits_assigned: next }).eq("id", id);
        if (error) throw error;
        await logEvent(id, "credits_adjusted", { mode, delta, from: current, to: next });
        toast.success(`Créditos: ${current} → ${next}`);
      }),

    remove: (id: string) =>
      wrap("eliminar", async () => {
        const res = (await invokeEdgeFunction("delete-tenant", { tenant_id: id })) as {
          error?: string;
          auth_user_deleted?: boolean;
        };
        if (res?.error) throw new Error(res.error);
        toast.success(res?.auth_user_deleted ? "Tenant y usuario eliminados" : "Tenant eliminado");
      }),
  };
}
