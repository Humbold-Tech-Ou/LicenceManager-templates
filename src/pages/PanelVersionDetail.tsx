import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  FileText,
  Rocket,
  Loader2,
  AlertCircle,
  Trash2,
  Users,
  FlaskConical,
  Check,
  ChevronRight,
  Send,
  Wrench,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VersionStatusBadge, type PanelVersion, type VersionStatus } from "@/pages/PanelVersions";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Preview screens (public /owner-preview/* routes seeded into the cascarón) ──
const PREVIEW_SCREENS: { value: string; label: string; path: string }[] = [
  { value: "login",     label: "Login",         path: "/owner-preview/login" },
  { value: "dashboard", label: "Dashboard",     path: "/owner-preview/dashboard" },
  { value: "lines",     label: "Mis Líneas",    path: "/owner-preview/lines" },
  { value: "resellers", label: "Resellers",     path: "/owner-preview/resellers" },
  { value: "packages",  label: "Paquetes",      path: "/owner-preview/packages" },
  { value: "servers",   label: "Servidores",    path: "/owner-preview/servers" },
  { value: "vod",       label: "VOD",           path: "/owner-preview/vod" },
  { value: "settings",  label: "Configuración", path: "/owner-preview/settings" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

const FALLBACK_TENANT_ID = "c585b8ed-e304-4d60-b71c-b8bde67256c4"; // Anthony — test tenant

interface VersionTenant {
  id: string;
  owner_name: string | null;
  owner_email: string;
  deploy_url: string | null;
  tenant_token: string | null;
  supabase_project_id: string | null;
  plan: string;
}

// ── Preview mock srcDoc ───────────────────────────────────────────────────────

function buildPreviewDoc(tenant: VersionTenant, versionNumber: string): string {
  const name        = tenant.owner_name ?? tenant.owner_email;
  const plan        = (tenant.plan ?? "basic").charAt(0).toUpperCase() + (tenant.plan ?? "basic").slice(1);
  const token       = tenant.tenant_token ?? "—";
  const supabaseUrl = tenant.supabase_project_id
    ? `https://${tenant.supabase_project_id}.supabase.co`
    : "—";

  return `<!DOCTYPE html>
<html lang="es" style="margin:0;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f11;">
<body style="margin:0;height:100%;display:flex;flex-direction:column;">

  <!-- Sidebar -->
  <div style="display:flex;flex:1;min-height:0;">
    <nav style="width:220px;background:#18181b;border-right:1px solid #27272a;padding:20px 0;display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
      <!-- Brand -->
      <div style="padding:0 16px 16px;border-bottom:1px solid #27272a;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;">L</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#f4f4f5;">License Manager</div>
            <div style="font-size:10px;color:#71717a;">${versionNumber}</div>
          </div>
        </div>
      </div>
      <!-- Nav items -->
      ${["📊 Dashboard","👥 Clientes","📋 Licencias","💳 Créditos","⚙️ Configuración"].map((item, i) =>
        `<div style="padding:8px 16px;border-radius:6px;margin:0 8px;font-size:12px;font-weight:500;cursor:pointer;${i===0 ? "background:#7c3aed22;color:#a78bfa;" : "color:#a1a1aa;"}">
          ${item}
        </div>`
      ).join("")}
      <!-- Version badge at bottom -->
      <div style="margin-top:auto;padding:12px 16px 0;border-top:1px solid #27272a;">
        <div style="font-size:10px;color:#52525b;text-align:center;">
          <span style="background:#7c3aed22;color:#a78bfa;padding:2px 8px;border-radius:999px;font-weight:600;">${versionNumber}</span>
        </div>
      </div>
    </nav>

    <!-- Main content -->
    <main style="flex:1;overflow:auto;padding:24px;background:#0f0f11;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div>
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#f4f4f5;">Dashboard</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#71717a;">Panel de control · ${name}</p>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="background:#7c3aed22;border:1px solid #7c3aed44;color:#a78bfa;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:600;">${plan}</div>
          <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#6366f1);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;">${name.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      <!-- Metric cards -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
        ${[["Créditos","1,200","↑ 8% este mes"],["Licencias activas","3","de 5 disponibles"],["Vencimiento","12/2026","Renovación automática"]].map(([label,val,sub])=>
          `<div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:16px;">
            <p style="margin:0 0 4px;font-size:11px;color:#71717a;">${label}</p>
            <p style="margin:0;font-size:22px;font-weight:700;color:#f4f4f5;">${val}</p>
            <p style="margin:4px 0 0;font-size:10px;color:#52525b;">${sub}</p>
          </div>`
        ).join("")}
      </div>

      <!-- Config block -->
      <div style="background:#18181b;border:1px solid #27272a;border-radius:10px;padding:16px;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#a1a1aa;text-transform:uppercase;letter-spacing:.05em;">Configuración inyectada</p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${[["Token",token.length>16 ? token.slice(0,16)+"…" : token],["Supabase URL",supabaseUrl.replace("https://","")],["Plan",plan],["Versión",versionNumber]].map(([k,v])=>
            `<div style="display:flex;gap:8px;font-size:11px;">
              <span style="color:#52525b;min-width:96px;">${k}</span>
              <code style="color:#a78bfa;font-family:monospace;">${v}</code>
            </div>`
          ).join("")}
        </div>
      </div>

      <!-- Mock preview label -->
      <div style="margin-top:12px;text-align:center;">
        <span style="background:#27272a;color:#52525b;font-size:10px;padding:3px 10px;border-radius:999px;">
          🧪 Vista previa simulada — datos del tenant ${name}
        </span>
      </div>
    </main>
  </div>
</body>
</html>`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanelVersionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [version, setVersion] = useState<PanelVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [versionTenants, setVersionTenants] = useState<VersionTenant[]>([]);
  const [previewTenant, setPreviewTenant] = useState<VersionTenant | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  // increment to force iframe re-render without unmounting the whole tree
  const [previewKey, setPreviewKey] = useState(0);

  type DeployStep = "idle" | "injecting" | "deploying" | "ready" | "failed";
  const [deployStep, setDeployStep]     = useState<DeployStep>("idle");
  const [liveUrl, setLiveUrl]           = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  // ── Push to tenants ──
  type PushResult = { tenant_id: string; owner_email: string; ok: boolean; deploy_url?: string; error?: string };
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResults, setPushResults] = useState<PushResult[] | null>(null);
  const [repairing, setRepairing] = useState(false);

  // ── Preview mode (mock data routes in cascarón) ──
  const [seeding, setSeeding] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string>("dashboard");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase
      .from("panel_versions" as any)
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setVersion(null);
        } else {
          setVersion(data as unknown as PanelVersion);
          const savedUrl = (data as any).preview_url as string | null | undefined;
          if (savedUrl) {
            // Restore success state without needing a new deploy
            setLiveUrl(savedUrl);
            setDeployStep("ready");
          }
        }
        setLoading(false);
      });
  }, [id]);

  // ── Fetch tenants on this version + resolve preview tenant ───────────────────
  useEffect(() => {
    if (!id) return;
    const fields = "id, owner_name, owner_email, deploy_url, tenant_token, supabase_project_id, plan";
    (supabase
      .from("tenants")
      .select(fields) as any)
      .eq("panel_version_id", id)
      .then(async ({ data }: { data: unknown }) => {
        const tenants = ((data as any[]) ?? []) as VersionTenant[];
        setVersionTenants(tenants);
        if (tenants.length > 0) {
          console.log("Renderizando vista previa con datos de:", tenants[0].owner_name ?? tenants[0].owner_email);
          setPreviewTenant(tenants[0]);
          setUsingFallback(false);
          setPreviewKey((k) => k + 1);
        } else {
          // Fallback: load Anthony's test tenant
          const { data: fallback } = await supabase
            .from("tenants")
            .select(fields)
            .eq("id", FALLBACK_TENANT_ID)
            .single();
          if (fallback) {
            const ft = fallback as unknown as VersionTenant;
            console.log("Renderizando vista previa con datos de:", ft.owner_name ?? ft.owner_email, "(fallback)");
            setPreviewTenant(ft);
            setUsingFallback(true);
            setPreviewKey((k) => k + 1);
          }
        }
      });
  }, [id]);

  // ── Poll Vercel build status until READY / ERROR ─────────────────────────────
  useEffect(() => {
    if (deployStep !== "deploying" || !deploymentId) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("check-vercel-status", {
          body: { deployment_id: deploymentId },
        });
        const readyState = (data as any)?.ready_state as string | undefined;
        console.log("[PanelVersionDetail] Vercel readyState:", readyState);

        if (readyState === "READY") {
          clearInterval(interval);
          setDeployStep("ready");
          toast.success("¡Panel desplegado y listo!");
        } else if (readyState === "ERROR" || readyState === "CANCELED") {
          clearInterval(interval);
          setDeployStep("failed");
          toast.error(`El build de Vercel falló (${readyState})`);
        }
        // QUEUED / BUILDING → keep polling
      } catch {
        // transient error — keep polling
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [deployStep, deploymentId]);

  // ── Polling: refresh every 3 s while status is "deploying" ─────────────────
  useEffect(() => {
    if (!id || !version) return;

    if (version.status === "deploying") {
      pollingRef.current = setInterval(async () => {
        const { data } = await supabase
          .from("panel_versions" as any)
          .select("*")
          .eq("id", id)
          .single();
        if (data) {
          const updated = data as unknown as PanelVersion;
          setVersion(updated);
          if (updated.status !== "deploying") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            if (updated.status === "published") {
              toast.success(`¡Versión ${updated.version_number} publicada exitosamente!`);
            } else if (updated.status === "failed") {
              toast.error(`El despliegue de ${updated.version_number} falló.`);
            }
          }
        }
      }, 3000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [id, version?.status]);

  // ── Publish via Edge Function (triggers GitHub Actions + DB update) ──────────

  async function publishVersion() {
    if (!version) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("publish-version", {
        body: { version_number: version.version_number, record_id: version.id },
      });

      if (error) throw error;

      toast.info("Workflow de GitHub Actions iniciado. Esperando confirmación…");

      // Refresh from DB — status should now be "deploying"
      const { data: updated } = await supabase
        .from("panel_versions" as any)
        .select("*")
        .eq("id", version.id)
        .single();
      if (updated) setVersion(updated as unknown as PanelVersion);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al publicar: ${msg}`);
    }
    setSaving(false);
  }

  // ── Delete version ──────────────────────────────────────────────────────────

  async function deleteVersion() {
    if (!version) return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-version", {
        body: { record_id: version.id, version_number: version.version_number },
      });

      if (error) throw error;

      toast.success(`Versión ${version.version_number} eliminada correctamente`);
      navigate("/versions");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al eliminar: ${msg}`);
      setDeleting(false);
    }
  }

  // ── Deploy preview via Vercel pipeline ────────────────────────────────────

  async function deployPreview() {
    if (!version) return;
    setSaving(true);
    setDeployStep("injecting");
    try {
      // The function always returns HTTP 200 — failures are in data.success === false
      const { data } = await supabase.functions.invoke("deploy-tenant-preview", {
        body: { version_id: version.id },
      });

      const d = data as any;
      if (!d?.success) {
        const errMsg = d?.error ?? "Error desconocido en el despliegue";
        const errStep = d?.step ?? "unknown";
        console.error(`[deployPreview] failed at step "${errStep}":`, errMsg);
        setDeployStep("failed");
        toast.error(`Error (${errStep}): ${errMsg}`);
        setSaving(false);
        return;
      }

      const step   = d?.step as string | undefined;
      const url    = d?.preview_url as string | undefined;
      const dplId  = d?.deployment_id as string | undefined;

      if (url)   setLiveUrl(url);
      if (dplId) setDeploymentId(dplId);

      if (step === "injected_only") {
        // No Vercel configured — GitHub URL, mark ready immediately
        setDeployStep("ready");
        toast.success("Config inyectada en GitHub (sin Vercel configurado)");
      } else if (step === "deploying") {
        // Vercel accepted — polling useEffect will advance to "ready"
        setDeployStep("deploying");
        toast.info("Build iniciado en Vercel — verificando compilación…");
      } else {
        setDeployStep("ready");
        toast.success("Despliegue completado");
      }

      // Refresh version record (preview_url may have been saved)
      const { data: updated } = await supabase
        .from("panel_versions" as any)
        .select("*")
        .eq("id", version.id)
        .single();
      if (updated) setVersion(updated as unknown as PanelVersion);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setDeployStep("failed");
      toast.error(`Error: ${msg}`);
    }
    setSaving(false);
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <Topbar title="Cargando…" breadcrumb="Versiones de Panel" />
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Cargando versión…</span>
        </div>
      </>
    );
  }

  // ── Push version to all linked tenants ────────────────────────────────────
  async function pushToTenants() {
    if (!version) return;
    setPushing(true);
    setPushResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("push-version-to-tenants", {
        body: { version_id: version.id },
      });
      if (error) throw error;
      const d = data as { success: boolean; results?: PushResult[]; error?: string };
      if (!d.success) throw new Error(d.error ?? "Error desconocido");
      const results = d.results ?? [];
      setPushResults(results);
      const okCount = results.filter((r) => r.ok).length;
      if (okCount === results.length) {
        toast.success(`Actualización enviada a ${okCount}/${results.length} tenant(s)`);
      } else {
        toast.warning(`${okCount}/${results.length} tenant(s) actualizados — revisa los detalles`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al enviar actualización: ${msg}`);
    } finally {
      setPushing(false);
    }
  }

  // ── Repair: re-deploy this version on the master Vercel preview project ──
  async function repairDeployment() {
    if (!version) return;
    setRepairing(true);
    try {
      const { data, error } = await supabase.functions.invoke("repair-version-deployment", {
        body: { version_id: version.id },
      });
      if (error) throw error;
      const d = data as { success: boolean; preview_url?: string; state?: string; error?: string; log?: string[] };
      if (!d.success) throw new Error(d.error ?? "Error desconocido");
      toast.success(`Re-deployment iniciado (${d.state ?? "QUEUED"}). Refrescando…`);
      // Refresh version row so iframe picks up the new preview_url
      const { data: refreshed } = await supabase
        .from("panel_versions")
        .select("*")
        .eq("id", version.id)
        .single();
      if (refreshed) setVersion(refreshed as any);
      setPreviewKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Reparación falló: ${msg}`);
    } finally {
      setRepairing(false);
    }
  }

  // ── Unified: seed preview files + trigger deploy ────────────────────────────
  async function updatePreview() {
    if (!version) return;
    setSeeding(true);
    setDeployStep("idle");
    try {
      // Phase 1: seed mock-data files into the templates branch
      const { data: seedData, error: seedErr } = await supabase.functions.invoke("seed-template-preview", {
        body: { version_number: version.version_number },
      });
      if (seedErr) throw seedErr;
      const sd = seedData as { success: boolean; error?: string };
      if (!sd.success) throw new Error(sd.error ?? "Error sembrando preview");

      // Phase 2: trigger Vercel deploy
      setDeployStep("injecting");
      const { data, error: deployErr } = await supabase.functions.invoke("deploy-tenant-preview", {
        body: { version_id: version.id },
      });
      if (deployErr) throw deployErr;
      const d = data as any;
      if (!d?.success) {
        setDeployStep("failed");
        toast.error(`Error (${d?.step ?? "deploy"}): ${d?.error ?? "Error desconocido"}`);
        return;
      }

      if (d.preview_url)    setLiveUrl(d.preview_url);
      if (d.deployment_id)  setDeploymentId(d.deployment_id);

      if (d.step === "injected_only") {
        setDeployStep("ready");
        toast.success("Vista previa actualizada correctamente");
      } else {
        setDeployStep("deploying");
        toast.info("Build iniciado en Vercel — verificando compilación…");
      }

      const { data: updated } = await supabase
        .from("panel_versions" as any).select("*").eq("id", version.id).single();
      if (updated) setVersion(updated as unknown as PanelVersion);

    } catch (err: unknown) {
      setDeployStep("failed");
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSeeding(false);
    }
  }

  if (!version) {
    return (
      <>
        <Topbar title="Versión no encontrada" breadcrumb="Versiones de Panel" />
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm">La versión solicitada no existe.</p>
          <Button variant="outline" onClick={() => navigate("/versions")}>
            <ArrowLeft className="size-4 mr-2" /> Volver a versiones
          </Button>
        </div>
      </>
    );
  }

  const formattedDate = format(parseISO(version.updated_at), "dd/MM/yyyy hh:mm a", { locale: es });
  const releaseLines  = (version.release_notes ?? "Sin notas de lanzamiento.").split("\n");

  return (
    <>
      <Topbar title={version.version_number} breadcrumb="Versiones de Panel" />

      <div className="p-4 sm:p-6 space-y-5 animate-fade-in">

        {/* ── Back + status row ── */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/versions")}
            className="gap-1.5 text-muted-foreground -ml-1"
          >
            <ArrowLeft className="size-3.5" />
            Versiones
          </Button>
          <span className="text-border">·</span>
          <VersionStatusBadge status={version.status} />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">

          {/* ── LEFT: iframe browser ── */}
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            {/* Browser chrome */}
            {(() => {
              const screen = PREVIEW_SCREENS.find((s) => s.value === selectedScreen) ?? PREVIEW_SCREENS[1];
              const baseHost = liveUrl ?? previewTenant?.deploy_url ?? null;
              const previewUrl = baseHost
                ? `${baseHost.replace(/\/$/, "")}${screen.path}`
                : `https://github.com/Humbold-Tech-Ou/LicenceManager-templates/tree/${version.version_number}`;
              const displayUrl = baseHost
                ? `${baseHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}${screen.path}`
                : `LicenceManager-templates / ${version.version_number}`;
              return (
                <>
                  <div className="flex items-center gap-3 bg-muted/60 border-b border-border px-4 py-2.5">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="size-3 rounded-full bg-red-400/70" />
                      <div className="size-3 rounded-full bg-yellow-400/70" />
                      <div className="size-3 rounded-full bg-green-400/70" />
                    </div>
                    {baseHost && (
                      <div className="shrink-0">
                        <Select value={selectedScreen} onValueChange={(v) => { setSelectedScreen(v); setPreviewKey((k) => k + 1); }}>
                          <SelectTrigger className="h-7 w-[148px] text-xs gap-1.5 bg-background/80">
                            <Monitor className="size-3 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PREVIEW_SCREENS.map((s) => (
                              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 bg-background/80 rounded-md border border-border/70 px-3 py-1 text-xs text-muted-foreground font-mono truncate">
                      {displayUrl}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        title="Forzar nuevo despliegue"
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/80 transition-colors disabled:opacity-40"
                        disabled={saving}
                        onClick={() => {
                          setLiveUrl(null);
                          setDeploymentId(null);
                          setDeployStep("idle");
                          deployPreview();
                        }}
                      >
                        <RotateCcw className={`size-3.5 ${saving ? "animate-spin" : ""}`} />
                      </button>
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/80 transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Deploy step bar */}
                  {deployStep !== "idle" && (
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/40 border-b border-border text-xs">
                      <span className={`flex items-center gap-1 font-medium ${
                        deployStep === "injecting" ? "text-blue-600 animate-pulse"
                        : ["deploying","ready"].includes(deployStep) ? "text-green-600"
                        : deployStep === "failed" ? "text-red-500"
                        : "text-muted-foreground"
                      }`}>
                        {deployStep === "injecting"
                          ? <Loader2 className="size-3 animate-spin" />
                          : ["deploying","ready"].includes(deployStep)
                          ? <Check className="size-3" />
                          : <AlertCircle className="size-3" />}
                        Inyectando en GitHub
                      </span>
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <span className={`flex items-center gap-1 font-medium ${
                        deployStep === "deploying" ? "text-blue-600 animate-pulse"
                        : deployStep === "ready" ? "text-green-600"
                        : deployStep === "failed" ? "text-red-500"
                        : "text-muted-foreground"
                      }`}>
                        {deployStep === "deploying"
                          ? <Loader2 className="size-3 animate-spin" />
                          : deployStep === "ready"
                          ? <Check className="size-3" />
                          : deployStep === "failed"
                          ? <AlertCircle className="size-3" />
                          : null}
                        {deployStep === "deploying" ? "Verificando compilación…" : "Construyendo en Vercel"}
                      </span>
                      <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                      <span className={`flex items-center gap-1 font-medium ${deployStep === "ready" ? "text-green-600" : "text-muted-foreground"}`}>
                        {deployStep === "ready" && <Check className="size-3" />}
                        Despliegue listo
                      </span>
                    </div>
                  )}

                  {/* Tenant / fallback notices — only when showing mock iframe */}
                  {usingFallback && !liveUrl && (
                    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700">
                      <FlaskConical className="size-3.5 shrink-0" />
                      Vista previa usando datos del tenant de prueba — no hay tenants asignados a esta versión.
                    </div>
                  )}
                  {!usingFallback && previewTenant && !liveUrl && (
                    <div className="flex items-center gap-2 bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-600">
                      <Users className="size-3.5 shrink-0" />
                      Mostrando datos de <span className="font-medium ml-1">{previewTenant.owner_name ?? previewTenant.owner_email}</span>
                    </div>
                  )}
                  {/* Iframe area: real panel > deploying spinner > mock fallback */}
                  {(() => {
                    const realUrl = baseHost
                      ? `${baseHost.replace(/\/$/, "")}${screen.path}`
                      : null;
                    if (realUrl && deployStep !== "deploying") {
                      return (
                        <div className="relative" style={{ height: 600 }}>
                          <iframe
                            key={`live-${realUrl}-${previewKey}`}
                            title={`Panel real ${version.version_number}`}
                            src={realUrl}
                            className="w-full h-full border-0 bg-background"
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                          />
                          <div className="absolute bottom-3 right-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 shadow-md bg-background/95"
                              onClick={repairDeployment}
                              disabled={repairing}
                            >
                              {repairing ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Wrench className="size-3.5" />
                              )}
                              Reparar
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="gap-1.5 shadow-md"
                              onClick={() => window.open(realUrl, "_blank")}
                            >
                              <ExternalLink className="size-3.5" />
                              Abrir en pestaña
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    if (deployStep === "deploying" && liveUrl) {
                      return (
                        <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 bg-muted/20" style={{ minHeight: 480 }}>
                          <Loader2 className="size-10 animate-spin text-violet-500" />
                          <div className="text-center space-y-1">
                            <p className="text-sm font-semibold text-foreground">Compilando en Vercel…</p>
                            <p className="text-xs text-muted-foreground">Verificando estado cada 5 segundos.</p>
                            <p className="text-xs font-mono text-muted-foreground/60 mt-1 truncate max-w-xs">{liveUrl.replace(/^https?:\/\//, "")}</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <iframe
                        key={`${previewTenant?.id ?? "no-tenant"}-${previewKey}`}
                        title={`Vista previa ${version.version_number}`}
                        srcDoc={
                          previewTenant
                            ? buildPreviewDoc(previewTenant, version.version_number)
                            : `<!DOCTYPE html><html style="margin:0;height:100%;background:#0f0f11;"><body style="display:flex;align-items:center;justify-content:center;height:100%;color:#52525b;font-family:sans-serif;font-size:13px;">Cargando vista previa…</body></html>`
                        }
                        className="w-full border-0"
                        style={{ height: 480 }}
                        sandbox="allow-scripts"
                      />
                    );
                  })()}
                </>
              );
            })()}
          </div>

          {/* ── RIGHT: details sidebar ── */}
          <div className="space-y-4">

            {/* Version info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Detalles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Versión</span>
                  <span className="font-mono font-semibold text-foreground">{version.version_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estado</span>
                  <VersionStatusBadge status={version.status} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Creada</span>
                  <span className="text-foreground text-xs">
                    {format(parseISO(version.created_at), "dd/MM/yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Actualizada</span>
                  <span className="text-foreground text-xs">{formattedDate}</span>
                </div>
              </CardContent>
            </Card>

            {/* Release notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-3.5 text-muted-foreground" />
                  Notas de lanzamiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {releaseLines.map((line, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                      {line.startsWith("- ") ? (
                        <span className="flex gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{line.slice(2)}</span>
                        </span>
                      ) : (
                        line || <span className="italic opacity-50">Sin descripción</span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Tenants en esta versión */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-3.5 text-muted-foreground" />
                  Tenants en esta versión
                </CardTitle>
              </CardHeader>
              <CardContent>
                {versionTenants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ningún tenant está usando esta versión actualmente.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {versionTenants.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-xs">
                        <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="font-medium text-foreground">{t.owner_name ?? t.owner_email}</span>
                        {t.owner_name && <span className="text-muted-foreground">{t.owner_email}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* ── Action button ── */}
            <div className="pt-1">
              {version.status === "draft" && (
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700 shadow-sm"
                    onClick={publishVersion}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader2 className="size-4 animate-spin" /> Publicando…</>
                      : <><Rocket className="size-4" /> Publicar Versión</>
                    }
                  </Button>
                  {saving && (
                    <p className="text-center text-xs text-muted-foreground animate-pulse">
                      Disparando workflow de GitHub Actions…
                    </p>
                  )}
                </div>
              )}

              {version.status === "deploying" && (
                <div className="space-y-2">
                  <Button
                    className="w-full gap-2 bg-blue-600 hover:bg-blue-600 shadow-sm cursor-not-allowed"
                    disabled
                  >
                    <Loader2 className="size-4 animate-spin" />
                    Desplegando en GitHub…
                  </Button>
                  <p className="text-center text-xs text-muted-foreground animate-pulse">
                    Esperando confirmación del workflow…
                  </p>
                </div>
              )}

              {version.status === "failed" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="size-3.5 shrink-0" />
                    El despliegue anterior falló. Puedes reintentarlo.
                  </div>
                  <Button
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700 shadow-sm"
                    onClick={publishVersion}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader2 className="size-4 animate-spin" /> Publicando…</>
                      : <><Rocket className="size-4" /> Reintentar Despliegue</>
                    }
                  </Button>
                </div>
              )}

              {version.status === "published" && (
                <div className="flex flex-col items-stretch gap-1">
                  <Button
                    className="w-full gap-2 bg-violet-600 hover:bg-violet-700 shadow-sm"
                    onClick={updatePreview}
                    disabled={seeding || deployStep === "deploying"}
                  >
                    {seeding || deployStep === "deploying"
                      ? <>
                          <Loader2 className="size-4 animate-spin" />
                          {seeding && deployStep === "idle"      && "Sembrando preview…"}
                          {seeding && deployStep === "injecting" && "Inyectando en Vercel…"}
                          {!seeding && deployStep === "deploying" && "Compilando en Vercel…"}
                        </>
                      : <><RefreshCw className="size-4" /> Actualizar vista previa</>
                    }
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Última Act. {formattedDate}
                  </p>

                  <Button
                    variant="outline"
                    className="w-full gap-2 mt-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={() => { setPushResults(null); setPushDialogOpen(true); }}
                    disabled={saving || pushing || versionTenants.length === 0}
                    title={versionTenants.length === 0 ? "No hay tenants vinculados a esta versión" : undefined}
                  >
                    {pushing
                      ? <><Loader2 className="size-4 animate-spin" /> Enviando…</>
                      : <><Send className="size-4" /> Enviar actualización a tenants ({versionTenants.length})</>
                    }
                  </Button>
                  {pushResults && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {pushResults.map((r) => (
                        <li key={r.tenant_id} className="flex items-center gap-2">
                          {r.ok
                            ? <Check className="size-3 text-green-600 shrink-0" />
                            : <AlertCircle className="size-3 text-red-500 shrink-0" />}
                          <span className="truncate flex-1">{r.owner_email}</span>
                          {r.ok && r.deploy_url && (
                            <a href={r.deploy_url} target="_blank" rel="noreferrer" className="text-violet-600 hover:underline">
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {version.status === "deprecated" && (
                <Button className="w-full" variant="outline" disabled>
                  Versión obsoleta
                </Button>
              )}

              {/* ── Destructive delete (always visible) ── */}
              <div className="pt-2 border-t border-border/60">
                <Button
                  variant="destructive"
                  className="w-full gap-2 opacity-80 hover:opacity-100"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={saving || deleting}
                >
                  <Trash2 className="size-4" />
                  Eliminar Versión
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Confirm delete dialog ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar versión {version.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Se eliminará el registro de la base de datos y se
              intentará borrar la rama <span className="font-mono font-medium">{version.version_number}</span> del
              repositorio de plantillas en GitHub.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteVersion}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm push-to-tenants dialog ── */}
      <AlertDialog open={pushDialogOpen} onOpenChange={setPushDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar actualización a tenants</AlertDialogTitle>
            <AlertDialogDescription>
              Se redesplegará el panel de <span className="font-semibold">{versionTenants.length} tenant(s)</span>{" "}
              con la versión <span className="font-mono font-medium">{version.version_number}</span> en sus
              cuentas Vercel. Esta acción es segura — Vercel mantiene la URL anterior accesible hasta que el
              nuevo build termine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pushing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={pushToTenants}
              disabled={pushing}
              className="bg-violet-600 text-white hover:bg-violet-700 gap-2"
            >
              {pushing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {pushing ? "Enviando…" : "Sí, enviar actualización"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
