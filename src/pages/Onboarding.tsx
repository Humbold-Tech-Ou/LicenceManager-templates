import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useOnboarding, loadOnboardingLS, clearOnboardingLS, deriveStep } from "@/hooks/useOnboarding";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import StepIndicator, { sidebarIdx, SIDEBAR_MAX } from "@/components/onboarding/StepIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  Loader2,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  X,
  LogOut,
  Copy,
  Github,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// ── helpers ───────────────────────────────────────────────────────────────────

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("No se pudo copiar")
  );
}

// ── sub-components ────────────────────────────────────────────────────────────

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 overflow-hidden min-w-0">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function AdminCredentialsForm({
  defaultEmail,
  loading,
  error,
  deployUrl,
  onSubmit,
}: {
  defaultEmail: string;
  loading: boolean;
  error: string;
  deployUrl: string | null;
  onSubmit: (email: string, password: string) => Promise<boolean>;
}) {
  const [email, setEmail]         = useState(defaultEmail);
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [localError, setLocalError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError("");
    if (password.length < 6) {
      setLocalError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Las contraseñas no coinciden.");
      return;
    }
    await onSubmit(email, password);
  }

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {deployUrl && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-start gap-2">
          <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-medium text-green-700">Panel desplegado exitosamente</p>
            <p className="text-xs text-green-600 font-mono break-all">{deployUrl}</p>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="admin-email">Email de administrador</Label>
        <Input
          id="admin-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@tuempresa.com"
          autoComplete="username"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-password">Contraseña</Label>
        <Input
          id="admin-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin-confirm">Confirmar contraseña</Label>
        <Input
          id="admin-confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
        />
      </div>

      {displayError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5">
          <p className="text-xs text-red-600">{displayError}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Completar configuración
      </Button>
    </form>
  );
}

function ConnectedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 px-3 py-1 text-xs font-medium">
      <Check className="size-3" /> {label} conectado
    </span>
  );
}

function VarRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0 w-full">
      <div className="flex-1 min-w-0 overflow-hidden rounded bg-muted px-2 py-1.5">
        <code className="block whitespace-nowrap overflow-x-auto text-xs font-mono text-foreground scrollbar-thin">
          <span className="text-violet-600">{name}</span>=<span className="opacity-70">{value || "—"}</span>
        </code>
      </div>
      <button
        onClick={() => copyText(`${name}=${value}`, name)}
        className="shrink-0 flex size-7 items-center justify-center rounded border border-border bg-background text-muted-foreground hover:text-foreground hover:border-violet-400 transition-colors"
        title={`Copiar ${name}`}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

function DeployOptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-violet-500 bg-violet-50 shadow-sm"
          : "border-border bg-background hover:border-violet-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
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
    deployPlatform,
    setDeployPlatform,
    deployStep,
    setDeployStep,
    deployUrl,
    deployInspectorUrl,
    autoDeployAndFinalize,
    setupTenantAdmin,
  } = useOnboarding();

  const [tokenInput, setTokenInput] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [exitDialog, setExitDialog] = useState(false);
  const exitOverlayRef = useRef<HTMLDivElement>(null);

  // Computed env vars for the deploy step
  const projectId = tenant?.supabase_project_id ?? "";
  const clientSupabaseUrl = (tenant as any)?.client_supabase_url ?? `https://${projectId}.supabase.co`;
  const clientAnonKey = (tenant as any)?.client_supabase_anon_key ?? "";

  const isDockerOrOther = deployPlatform === "docker" || deployPlatform === "other";
  const isVercelAuto = deployPlatform === "vercel";
  const isCloudflare = deployPlatform === "cloudflare";

  const dockerComposeContent =
    `version: '3.8'\n` +
    `services:\n` +
    `  vivacore-panel:\n` +
    `    image: humbold-tech/vivacore-panel:latest\n` +
    `    ports:\n` +
    `      - "80:80"\n` +
    `    environment:\n` +
    `      - VITE_TENANT_TOKEN=${tenantToken || "tu_token_aqui"}\n` +
    `      - VITE_SUPABASE_URL=${clientSupabaseUrl || "tu_url_aqui"}\n` +
    `      - VITE_SUPABASE_ANON_KEY=${clientAnonKey || "tu_anon_key_aqui"}\n` +
    `    restart: always\n` +
    `\n` +
    `  watchtower:\n` +
    `    image: containrrr/watchtower\n` +
    `    volumes:\n` +
    `      - /var/run/docker.sock:/var/run/docker.sock\n` +
    `    command: --interval 86400 vivacore-panel\n` +
    `    restart: always`;


  // ── on mount: restore from localStorage or OAuth callback ──────────────────
  useEffect(() => {
    const connected = searchParams.get("connected");
    const stepParam = searchParams.get("step");
    const tokenFromUrl = searchParams.get("token");

    if (connected && tenantId) {
      const nextStep = stepParam ? parseInt(stepParam) : undefined;
      restoreFromOAuth(tenantId, connected, nextStep)
        .then(() => toast.success(`${connected.charAt(0).toUpperCase() + connected.slice(1)} conectado correctamente`))
        .catch(() => {});
      return;
    }

    if (tenantId) {
      const persisted = loadOnboardingLS();
      if (persisted?.tenantId === tenantId) {
        restoreFromOAuth(tenantId, "", persisted.step).catch(() => {});
      }
      return;
    }

    if (tokenFromUrl && !tenant) {
      setTokenInput(tokenFromUrl);
      validateToken(tokenFromUrl)
        .then((ok) => { if (ok) toast.success("Token validado correctamente"); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, searchParams]);

  // Confetti when done (step 8)
  useEffect(() => {
    if (step === 8) {
      confetti({ particleCount: 180, spread: 80, origin: { y: 0.55 } });
    }
  }, [step]);

  // Auto-deploy when entering step 6 (only for automated platforms)
  useEffect(() => {
    if (step === 6 && deployStep === "idle" && (deployPlatform === "vercel" || deployPlatform === "cloudflare")) {
      autoDeployAndFinalize();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function handleExit() { navigate("/login"); }

  // ── done screen (step 8) ─────────────────────────────────────────────────
  if (step === 8 || tenant?.onboarding_done) {
    const panelUrl = tenant?.deploy_url ?? "";
    const loginUrl = panelUrl ? `${panelUrl}/owner/login` : panelUrl;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-lg w-full rounded-xl border border-border bg-card p-8 text-center space-y-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto">
            <ShieldCheck className="size-6" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">¡Tu cuenta ha sido configurada! 🎉</h1>
          <p className="text-sm text-muted-foreground">
            Tu panel está listo. Revisa tu correo electrónico para ver tus credenciales de acceso.
          </p>
          {loginUrl && (
            <a
              href={loginUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Ir a mi panel <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    );
  }

  const currentSidebarIdx = sidebarIdx(step);
  const displayStep = Math.max(1, currentSidebarIdx);

  return (
    <div className="min-h-screen bg-background px-4 py-10 overflow-x-hidden">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border">
              <ShieldCheck className="size-4 text-violet-600" />
            </div>
            <span className="font-semibold text-foreground truncate">License Manager</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {tenant && (
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[160px]">
                {tenant.owner_name ?? tenant.owner_email}
              </span>
            )}
            {step > 0 && (
              <button
                onClick={() => setExitDialog(true)}
                aria-label="Salir del wizard"
                className="group relative flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500 active:scale-95"
              >
                <LogOut className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${(currentSidebarIdx / SIDEBAR_MAX) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paso {displayStep} de {SIDEBAR_MAX}
          </p>
        </div>

        {/* Two-column layout — sidebar hidden on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[148px_1fr] gap-6 md:gap-8">
          <div className="hidden md:block shrink-0">
            <StepIndicator currentStep={step} deployPlatform={deployPlatform} />
          </div>

          {/* Content — min-w-0 prevents grid cell from blowing out */}
          <div className="min-w-0 min-h-[320px] space-y-4">

            {/* Tenant summary banner */}
            {step > 0 && tenant && (
              <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-foreground truncate">{tenant.owner_name ?? tenant.owner_email}</span>
                  <span className="ml-2 text-muted-foreground capitalize">{tenant.plan}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  Vence: {format(new Date(tenant.expires_at), "PPP", { locale: es })}
                </span>
              </div>
            )}

            {/* ── STEP 0 — Token ── */}
            {step === 0 && (
              <StepCard title="Bienvenido" description="Ingresa el token que recibiste en tu correo electrónico para comenzar.">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await validateToken(tokenInput);
                    if (ok) toast.success("Token validado correctamente");
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="token">Token de acceso</Label>
                    <Input
                      id="token"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={tokenInput}
                      onChange={(e) => { setTokenInput(e.target.value); setError(""); }}
                      className="font-mono text-sm"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={loading || !tokenInput.trim()} className="bg-violet-600 hover:bg-violet-700 gap-2">
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Validar token
                  </Button>
                </form>
              </StepCard>
            )}

            {/* ── STEP 1 — Conectar Supabase ── */}
            {step === 1 && (
              <StepCard
                title="Conectar Supabase"
                description="Autoriza el acceso a tu cuenta de Supabase para seleccionar el proyecto donde se instalará tu panel."
              >
                {tenant?.supabase_connected ? (
                  <div className="space-y-3">
                    <ConnectedBadge label="Supabase" />
                    <Button onClick={() => setStep(2)} className="bg-violet-600 hover:bg-violet-700">Continuar</Button>
                  </div>
                ) : (
                  <>
                    <Button onClick={() => startOAuth("supabase")} disabled={loading} className="bg-violet-600 hover:bg-violet-700 gap-2">
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      Conectar con Supabase
                    </Button>
                    {error && <p className="text-sm text-destructive mt-2">{error}</p>}
                  </>
                )}
              </StepCard>
            )}

            {/* ── STEP 2 — Seleccionar proyecto ── */}
            {step === 2 && (
              <StepCard
                title="Seleccionar proyecto Supabase"
                description="Elige el proyecto donde se desplegará el schema de tu panel IPTV."
              >
                {supabaseProjects.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Cargando proyectos...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Proyecto</Label>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <option value="">Selecciona un proyecto...</option>
                        {supabaseProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.region})</option>
                        ))}
                      </select>
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button
                      onClick={() => {
                        const proj = supabaseProjects.find((p) => p.id === selectedProject);
                        if (!proj) { toast.error("Selecciona un proyecto"); return; }
                        selectSupabaseProject(proj.id, proj.name);
                      }}
                      disabled={loading || !selectedProject}
                      className="bg-violet-600 hover:bg-violet-700 gap-2"
                    >
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      Desplegar schema
                    </Button>
                  </div>
                )}
              </StepCard>
            )}

            {/* ── STEP 3 — Selección de plataforma ── */}
            {step === 3 && (
              <StepCard
                title="Elige tu plataforma de despliegue"
                description="Según tu elección te guiaremos con el flujo más adecuado."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <DeployOptionCard
                      selected={deployPlatform === "vercel"}
                      onClick={() => setDeployPlatform("vercel")}
                      icon="▲"
                      title="Vercel"
                      description="CDN global, deploy automático"
                    />
                    <DeployOptionCard
                      selected={deployPlatform === "cloudflare"}
                      onClick={() => setDeployPlatform("cloudflare")}
                      icon="☁️"
                      title="Cloudflare Pages"
                      description="Gratis hasta 500 builds/mes"
                    />
                    <DeployOptionCard
                      selected={deployPlatform === "docker"}
                      onClick={() => setDeployPlatform("docker")}
                      icon="🐳"
                      title="Docker / VPS"
                      description="Control total en tu servidor"
                    />
                  </div>
                  <Button
                    onClick={() => setStep(4)}
                    disabled={!deployPlatform}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    Continuar →
                  </Button>
                </div>
              </StepCard>
            )}

            {/* ── STEP 4 — Conectar plataforma de despliegue ── */}
            {step === 4 && (isVercelAuto || isCloudflare) && (
              <StepCard
                title={`Conectar ${isVercelAuto ? "Vercel" : "Cloudflare Pages"}`}
                description={`Autoriza el acceso a tu cuenta de ${isVercelAuto ? "Vercel" : "Cloudflare"} para que podamos crear y desplegar tu panel automáticamente.`}
              >
                {(tenant as any)?.deploy_connected && (tenant as any)?.deploy_platform === deployPlatform ? (
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 px-3 py-1 text-xs font-medium">
                      <Check className="size-3" /> {isVercelAuto ? "Vercel" : "Cloudflare"} conectado
                    </span>
                    <div>
                      <Button onClick={() => setStep(5)} className="bg-violet-600 hover:bg-violet-700">
                        Continuar →
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-3 rounded-lg bg-violet-50 border border-violet-100 px-4 py-3">
                      <Info className="size-4 text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-violet-700">
                        {isVercelAuto
                          ? "Crearemos el proyecto directamente en tu cuenta de Vercel y desplegaremos el panel con tu configuración. Necesitamos acceso de lectura/escritura a tus deployments."
                          : "Crearemos el proyecto en tu cuenta de Cloudflare Pages con tu configuración personalizada."}
                      </p>
                    </div>
                    <Button
                      onClick={() => startDeployOAuth(isVercelAuto ? "vercel" : "cloudflare")}
                      disabled={loading}
                      className="bg-black hover:bg-gray-800 gap-2"
                    >
                      {loading && <Loader2 className="size-4 animate-spin" />}
                      {isVercelAuto ? "▲ Conectar con Vercel" : "☁️ Conectar con Cloudflare"}
                    </Button>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                  </div>
                )}
              </StepCard>
            )}

            {step === 4 && isDockerOrOther && (
              <StepCard
                title="Tus Credenciales"
                description="Copia estas variables de entorno. Las necesitarás para ejecutar tu contenedor."
              >
                <div className="space-y-2">
                  <VarRow name="VITE_TENANT_TOKEN" value={tenantToken} />
                  <VarRow name="VITE_SUPABASE_URL" value={clientSupabaseUrl} />
                  <VarRow name="VITE_SUPABASE_ANON_KEY" value={clientAnonKey} />
                </div>
                <button
                  onClick={() => copyText(
                    `VITE_TENANT_TOKEN=${tenantToken}\nVITE_SUPABASE_URL=${clientSupabaseUrl}\nVITE_SUPABASE_ANON_KEY=${clientAnonKey}`,
                    "Todas las variables"
                  )}
                  className="mt-2 text-xs text-violet-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="size-3" /> Copiar todas
                </button>
                <div className="pt-3 border-t border-border">
                  <Button onClick={() => setStep(5)} className="bg-violet-600 hover:bg-violet-700">
                    Continuar →
                  </Button>
                </div>
              </StepCard>
            )}

            {/* ── STEP 5 — Desplegar panel (Vercel / Cloudflare auto) ── */}
            {step === 5 && (isVercelAuto || isCloudflare) && (
              <StepCard
                title="Desplegar tu Panel"
                description={`Tu cuenta de ${isVercelAuto ? "Vercel" : "Cloudflare Pages"} está conectada. Haz clic para crear el proyecto y desplegar tu panel automáticamente.`}
              >
                <div className="space-y-4">
                  <div className="flex gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                    <Check className="size-4 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-green-700">
                      {isVercelAuto ? "Vercel" : "Cloudflare"} conectado. Crearemos el proyecto con tu configuración personalizada e inyectaremos tus variables de entorno automáticamente.
                    </p>
                  </div>
                  <Button
                    onClick={() => setStep(6)}
                    className="bg-violet-600 hover:bg-violet-700 gap-2"
                  >
                    Desplegar mi panel →
                  </Button>
                </div>
              </StepCard>
            )}

            {step === 5 && isDockerOrOther && (
              <StepCard
                title="Ejecuta tu Contenedor"
                description="Crea un archivo docker-compose.yml en tu servidor y pega esta configuración."
              >
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Hemos incluido <span className="font-medium text-foreground">Watchtower</span> para que tu panel se actualice automáticamente cuando lancemos mejoras.
                  </p>

                  {/* docker-compose.yml block */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-mono text-muted-foreground">docker-compose.yml</span>
                      <button
                        onClick={() => copyText(dockerComposeContent, "docker-compose.yml")}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:underline"
                      >
                        <Copy className="size-3" /> Copiar
                      </button>
                    </div>
                    <div className="relative rounded-lg bg-gray-900 p-4 overflow-hidden">
                      <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre pr-2">
                        {dockerComposeContent}
                      </pre>
                    </div>
                  </div>

                  {/* docker-compose up command */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Luego ejecuta:</p>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5">
                      <code className="flex-1 text-xs text-green-400 font-mono">docker-compose up -d</code>
                      <button
                        onClick={() => copyText("docker-compose up -d", "Comando")}
                        className="shrink-0 flex size-6 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        title="Copiar comando"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <Button onClick={() => setStep(6)} className="bg-violet-600 hover:bg-violet-700">
                      Ya desplegué mi panel →
                    </Button>
                  </div>
                </div>
              </StepCard>
            )}

            {/* ── STEP 6 — Auto-deploy ── */}
            {step === 6 && (
              <StepCard
                title="Desplegando tu Panel en Vercel"
                description="Configuramos tu panel automáticamente: inyectamos tu configuración en GitHub y lanzamos el build en Vercel. Tarda 1–3 minutos."
              >
                <div className="space-y-5">

                  {/* deploying / polling */}
                  {(deployStep === "deploying" || deployStep === "polling") && (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <Loader2 className="size-10 animate-spin text-violet-500" />
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {deployStep === "deploying"
                            ? "Inyectando configuración en GitHub…"
                            : "Compilando en Vercel…"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Por favor espera. Verificamos automáticamente cada 5 segundos.
                        </p>
                      </div>
                      {deployUrl && (
                        <p className="text-xs text-muted-foreground break-all text-center">
                          URL asignada: <span className="font-mono text-violet-600">{deployUrl}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* ready */}
                  {deployStep === "ready" && deployUrl && (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <Check className="size-6" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-semibold text-foreground">¡Despliegue exitoso!</p>
                        <p className="text-xs text-muted-foreground break-all">{deployUrl}</p>
                      </div>
                      <a
                        href={deployUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                      >
                        Abrir mi panel <ExternalLink className="size-3.5" />
                      </a>
                    </div>
                  )}

                  {/* failed */}
                  {deployStep === "failed" && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-2">
                        <p className="text-sm font-medium text-red-700">El despliegue falló</p>
                        {error && (
                          <p className="text-xs text-red-600 font-mono break-all whitespace-pre-wrap">{error}</p>
                        )}
                        {deployInspectorUrl && (
                          <a
                            href={deployInspectorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-red-700 underline underline-offset-2 hover:text-red-900"
                          >
                            Ver logs de Vercel →
                          </a>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => { setDeployStep("idle"); setTimeout(autoDeployAndFinalize, 0); }}
                          className="bg-violet-600 hover:bg-violet-700 gap-2"
                        >
                          Reintentar
                        </Button>
                        <Button variant="ghost" onClick={() => setStep(5)} className="text-muted-foreground gap-1.5">
                          <ArrowLeft className="size-3.5" /> Volver
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* idle fallback (shouldn't normally appear) */}
                  {deployStep === "idle" && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Iniciando despliegue…</p>
                    </div>
                  )}
                </div>
              </StepCard>
            )}

            {/* ── STEP 7 — Admin credentials ── */}
            {step === 7 && (
              <StepCard
                title="Configura tu cuenta de administrador"
                description="Crea las credenciales con las que accederás a tu panel. Te enviaremos un correo de confirmación."
              >
                <AdminCredentialsForm
                  defaultEmail={tenant?.owner_email ?? ""}
                  loading={loading}
                  error={error}
                  deployUrl={deployUrl ?? tenant?.deploy_url ?? null}
                  onSubmit={setupTenantAdmin}
                />
              </StepCard>
            )}

            {/* Navigation back button (steps 1-5, step 6 has its own back button) */}
            {step >= 1 && step <= 5 && (
              <div className="flex justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="gap-1.5 text-muted-foreground"
                >
                  <ArrowLeft className="size-3.5" /> Anterior
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit dialog */}
      {exitDialog && (
        <div
          ref={exitOverlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ animation: "fadeIn 150ms ease" }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setExitDialog(false)} />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
            style={{ animation: "slideUp 180ms cubic-bezier(0.34,1.56,0.64,1)" }}
          >
            <button
              onClick={() => setExitDialog(false)}
              className="absolute right-4 top-4 flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
            <div className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-orange-600 mx-auto mb-4">
              <LogOut className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-foreground text-center">¿Salir del onboarding?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground text-center">
              Tu progreso se guardará. Puedes continuar cuando vuelvas.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setExitDialog(false)}>Continuar</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleExit}>Salir</Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
