import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunctionWithToken, EdgeFunctionError } from "@/lib/helpers";
import type { Tenant } from "@/types/tenant";

const LS_KEY = "onboarding_state";

interface PersistedState {
  tenantId: string;
  step: number;
  tenantToken: string;
}

export function saveLS(state: PersistedState) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function clearOnboardingLS() {
  localStorage.removeItem(LS_KEY);
}

export function loadOnboardingLS(): PersistedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

/**
 * Derives the correct wizard step from DB state flags.
 * Steps: 0=token 1=supabase-oauth 2=select-project 3=create-repo 4=configure-deploy 5=confirm-url 6=done
 */
export function deriveStep(t: Tenant): number {
  if (t.onboarding_done) return 7;
  if ((t as any).deploy_url) return 7;
  if (t.supabase_project_id) return 3;
  if (t.supabase_connected) return 2;
  return 1;
}

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantToken, setTenantToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseProjects, setSupabaseProjects] = useState<
    { id: string; name: string; region: string }[]
  >([]);

  // ── validate token (step 0 → step 1+) ─────────────────────────────────────
  async function validateToken(token: string): Promise<boolean> {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase
        .from("tenants")
        .select("*")
        .eq("tenant_token", token.trim())
        .maybeSingle();
      if (err || !data) {
        setError("Token inválido. Verifica el token recibido por email.");
        return false;
      }
      const t = data as Tenant;
      setTenantToken(token.trim());
      setTenant(t);
      const nextStep = deriveStep(t);
      setStep(nextStep);
      saveLS({ tenantId: t.id, step: nextStep, tenantToken: token.trim() });
      return true;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ── restore after OAuth redirect or page reload ────────────────────────────
  async function restoreFromOAuth(
    tenantId: string,
    _connected: string,
    nextStep?: number
  ) {
    setLoading(true);
    try {
      const persisted = loadOnboardingLS();
      if (!persisted?.tenantToken) {
        clearOnboardingLS();
        return; // step stays 0 — token entry form
      }
      setTenantToken(persisted.tenantToken);

      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();
      if (!data) return;
      const t = data as Tenant;
      setTenant(t);

      const resolvedStep = nextStep ?? deriveStep(t);
      setStep(resolvedStep);
      saveLS({ tenantId: t.id, step: resolvedStep, tenantToken: persisted.tenantToken });
    } finally {
      setLoading(false);
    }
  }

  // ── Supabase OAuth start ───────────────────────────────────────────────────
  async function startOAuth(provider: "supabase") {
    if (!tenant) return;
    if (!tenantToken) {
      setError("Tu sesión expiró. Regresa al paso anterior e ingresa tu token nuevamente.");
      return;
    }
    setLoading(true);
    saveLS({ tenantId: tenant.id, step, tenantToken });
    try {
      const res = await invokeEdgeFunctionWithToken<{ auth_url: string }>("oauth-start", {
        tenant_id: tenant.id,
        provider,
        base_url: window.location.origin,
      }, tenantToken);
      window.location.href = res.auth_url;
    } catch {
      setError("Error iniciando conexión con Supabase");
      setLoading(false);
    }
  }

  // ── load Supabase projects (step 2) ───────────────────────────────────────
  async function loadProjects() {
    if (!tenant) return;
    try {
      const res = await invokeEdgeFunctionWithToken<{ id: string; name: string; region: string }[]>(
        "supabase-list-projects",
        { tenant_id: tenant.id },
        tenantToken
      );
      setSupabaseProjects(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof EdgeFunctionError || msg.toLowerCase().includes("access token") || msg.toLowerCase().includes("reconnect")) {
        setError("Tu conexión con Supabase expiró. Vuelve a conectarte.");
        setTenant((t) => t ? { ...t, supabase_connected: false } : t);
        setStep(1);
      } else {
        setError("Error cargando proyectos de Supabase");
      }
    }
  }

  // ── deploy schema and fetch anon key (step 2 → step 3) ────────────────────
  async function selectSupabaseProject(projectId: string, projectName: string) {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      await invokeEdgeFunctionWithToken("supabase-deploy-schema", {
        tenant_id: tenant.id,
        project_id: projectId,
      }, tenantToken);
      const updated = { ...tenant, supabase_project_id: projectId, supabase_project_name: projectName } as Tenant;
      setTenant(updated);
      setStep(3);
    } catch {
      setError("Error desplegando schema");
    } finally {
      setLoading(false);
    }
  }

  // ── finalize onboarding with deploy URL (step 4 → step 5) ─────────────────
  async function finalizeOnboarding(deployUrl: string) {
    if (!tenant) return;
    setLoading(true);
    setError("");
    try {
      await supabase
        .from("tenants")
        .update({ deploy_url: deployUrl.trim(), onboarding_done: true, onboarding_step: 4 } as any)
        .eq("id", tenant.id);
      await supabase
        .from("license_events")
        .insert([{ tenant_id: tenant.id, event_type: "onboarding_completed" }]);
      setTenant((t) => t ? { ...t, deploy_url: deployUrl.trim(), onboarding_done: true } : t);
      setStep(7);
      clearOnboardingLS();
    } catch {
      setError("Error guardando la URL. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  // Auto-load projects on step 2
  useEffect(() => {
    if (step === 2 && tenant?.supabase_connected) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tenant?.id]);

  return {
    step,
    setStep,
    tenant,
    loading,
    error,
    setError,
    supabaseProjects,
    tenantToken,
    validateToken,
    restoreFromOAuth,
    startOAuth,
    selectSupabaseProject,
    finalizeOnboarding,
  };
}
