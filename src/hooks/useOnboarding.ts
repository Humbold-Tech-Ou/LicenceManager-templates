import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeEdgeFunctionWithToken, EdgeFunctionError } from "@/lib/helpers";
import type { Tenant } from "@/types/tenant";

const LS_KEY = "onboarding_state";

interface PersistedState {
  tenantId: string;
  step: number;
  tenantToken: string;
  /** Platform chosen at step 3 — persisted so it survives OAuth redirects */
  deployPlatform?: string;
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
 *   0  = token entry
 *   1  = connect Supabase (OAuth)
 *   2  = select Supabase project
 *   3  = choose deploy platform
 *   4  = connect deploy platform (OAuth for Vercel/Cloudflare)
 *   5  = trigger deployment
 *   6  = deploy in progress / polling
 *   7  = configure admin credentials (NEW — after deploy is ready)
 *   8  = done ✓
 */
export function deriveStep(t: Tenant): number {
  if (t.onboarding_done) return 8;              // fully complete → done screen
  if ((t as any).deploy_url) return 7;          // deploy done → credential setup
  if ((t as any).deploy_connected) return 5;    // deploy platform OAuth done → ready to deploy
  if (t.supabase_project_id) return 3;          // supabase project chosen → pick platform
  if (t.supabase_connected) return 2;           // supabase OAuth done → pick project
  return 1;
}

export type DeployStep = "idle" | "deploying" | "polling" | "ready" | "failed";

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantToken, setTenantToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseProjects, setSupabaseProjects] = useState<
    { id: string; name: string; region: string }[]
  >([]);

  /** Platform chosen at step 3. Restored from LS or tenant.deploy_platform after OAuth. */
  const [deployPlatform, setDeployPlatform] = useState<string>("");

  // auto-deploy state (step 6)
  const [deployStep, setDeployStep] = useState<DeployStep>("idle");
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  const [deployInspectorUrl, setDeployInspectorUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── validate token (step 0 → step 1+) ─────────────────────────────────────
  async function validateToken(token: string): Promise<boolean> {
    setLoading(true);
    setError("");
    try {
      const { data: resp, error: err } = await supabase.functions.invoke(
        "validate-tenant-token",
        { body: { token: token.trim() } },
      );
      if (err || !resp?.tenant) {
        setError("Token inválido. Verifica el token recibido por email.");
        return false;
      }
      const t = resp.tenant as Tenant;
      setTenantToken(token.trim());
      setTenant(t);
      const nextStep = deriveStep(t);
      setStep(nextStep);
      // Restore platform from DB if tenant already connected a platform
      const platform = (t as any).deploy_platform ?? "";
      if (platform) setDeployPlatform(platform);
      saveLS({ tenantId: t.id, step: nextStep, tenantToken: token.trim(), deployPlatform: platform });
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

      // Restore platform: DB value takes priority (set by oauth-callback), then LS
      const platform = (t as any).deploy_platform ?? persisted.deployPlatform ?? "";
      if (platform) setDeployPlatform(platform);

      const resolvedStep = nextStep ?? deriveStep(t);
      setStep(resolvedStep);
      saveLS({ tenantId: t.id, step: resolvedStep, tenantToken: persisted.tenantToken, deployPlatform: platform });
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
    saveLS({ tenantId: tenant.id, step, tenantToken, deployPlatform });
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

  // ── Deploy platform OAuth start (Vercel / Cloudflare) ─────────────────────
  async function startDeployOAuth(provider: "vercel" | "cloudflare") {
    if (!tenant) return;
    if (!tenantToken) {
      setError("Tu sesión expiró. Regresa al paso anterior e ingresa tu token nuevamente.");
      return;
    }
    setLoading(true);
    // Persist platform before redirecting away
    saveLS({ tenantId: tenant.id, step, tenantToken, deployPlatform: provider });
    try {
      const res = await invokeEdgeFunctionWithToken<{ auth_url: string }>("oauth-start", {
        tenant_id: tenant.id,
        provider,
        base_url: window.location.origin,
      }, tenantToken);
      window.location.href = res.auth_url;
    } catch {
      setError(`Error iniciando conexión con ${provider}`);
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

  // ── auto-deploy at step 6 ─────────────────────────────────────────────────
  const autoDeployAndFinalize = useCallback(async () => {
    if (!tenant || !tenantToken) return;
    setDeployStep("deploying");
    setDeployUrl(null);
    setDeploymentId(null);
    setError("");
    try {
      const data = await invokeEdgeFunctionWithToken<{
        success: boolean;
        step?: string;
        error?: string;
        deploy_url?: string;
        deployment_id?: string;
        deployment_state?: string;
      }>("finalize-onboarding", { tenant_id: tenant.id }, tenantToken);

      if (!data.success) {
        setDeployStep("failed");
        setError(data.error ?? "Error desconocido al desplegar");
        return;
      }

      const url = data.deploy_url ?? null;
      setDeployUrl(url);

      if (data.deployment_id) {
        setDeploymentId(data.deployment_id);
        setDeployStep("polling");
      } else {
        // No deployment ID (e.g. injected_only fallback) — finalize directly
        setDeployStep("ready");
        if (url) {
          setTenant((t) => t ? { ...t, deploy_url: url, onboarding_done: true } : t);
          clearOnboardingLS();
          setStep(7);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeployStep("failed");
      setError(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id, tenantToken]);

  // Polling: when deployStep === "polling" && deploymentId, check Vercel every 5s
  useEffect(() => {
    if (deployStep !== "polling" || !deploymentId || !tenantToken) return;

    async function checkStatus() {
      try {
        const data = await invokeEdgeFunctionWithToken<{
          success: boolean;
          ready_state?: string;
          url?: string;
          error?: string;
          error_message?: string;
          inspector_url?: string;
        }>("check-vercel-status", {
          deployment_id: deploymentId,
          tenant_id: tenant?.id,
        }, tenantToken);

        if (!data.success) return; // keep polling

        const state = data.ready_state ?? "";
        console.log(`[useOnboarding] polling Vercel: ${state}`);

        if (state === "READY") {
          const finalUrl = data.url ?? deployUrl;
          setDeployUrl(finalUrl);
          setDeployStep("ready");
          if (pollingRef.current) clearInterval(pollingRef.current);

          // Save deploy_url — onboarding_done stays false until admin credentials are set (step 7)
          if (tenant && finalUrl) {
            await supabase
              .from("tenants")
              .update({ deploy_url: finalUrl, onboarding_step: 4 } as any)
              .eq("id", tenant.id);
            setTenant((t) => t ? { ...t, deploy_url: finalUrl } : t);
          }
          saveLS({ tenantId: tenant!.id, step: 7, tenantToken: tenantToken!, deployPlatform });
          setStep(7); // → credential setup form
        } else if (state === "ERROR" || state === "CANCELED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setDeployInspectorUrl(data.inspector_url ?? null);
          setDeployStep("failed");
          const detail = data.error_message ?? `Build falló (${state})`;
          setError(detail);
        }
      } catch {
        // Network error — keep polling
      }
    }

    pollingRef.current = setInterval(checkStatus, 5000);
    checkStatus(); // immediate first check
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deployStep, deploymentId]);

  // ── setup tenant admin credentials (step 7) ───────────────────────────────
  async function setupTenantAdmin(email: string, password: string): Promise<boolean> {
    if (!tenant || !tenantToken) return false;
    setLoading(true);
    setError("");
    try {
      const data = await invokeEdgeFunctionWithToken<{
        success: boolean;
        error?: string;
        panel_url?: string;
      }>("setup-tenant-admin", { email, password }, tenantToken);

      if (!data.success) {
        setError(data.error ?? "Error al crear el usuario administrador");
        return false;
      }
      // Mark onboarding complete in local state (DB update done by edge function)
      setTenant((t) => t ? { ...t, onboarding_done: true } : t);
      clearOnboardingLS();
      setStep(8);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }

  // ── finalize onboarding with deploy URL (manual fallback) ─────────────────
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
    startDeployOAuth,
    selectSupabaseProject,
    finalizeOnboarding,
    // platform
    deployPlatform,
    setDeployPlatform,
    // auto-deploy
    deployStep,
    setDeployStep,
    deployUrl,
    deployInspectorUrl,
    autoDeployAndFinalize,
    setupTenantAdmin,
  };
}
