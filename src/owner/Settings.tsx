import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Palette,
  FlaskConical,
  Network,
  User,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type { PanelConfig } from "@/types/owner-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-3 pl-0">{children}</div>
    </section>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner:    "Dueño",
  reseller: "Reseller",
  sub:      "Sub-reseller",
};
const ROLE_COLOR: Record<string, string> = {
  owner:    "bg-violet-100 text-violet-700",
  reseller: "bg-blue-100 text-blue-700",
  sub:      "bg-zinc-100 text-zinc-600",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const { reseller } = useOwnerAuth();
  const [config, setConfig] = useState<PanelConfig>({
    branding:      { name: "Mi Panel IPTV", primary_color: "#7C3AED" },
    demo_policy:   { global_monthly_limit: 50 },
    network_depth: { max_levels: null },
  });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Password
  const [newPass, setNewPass]           = useState("");
  const [showNewPass, setShowNewPass]   = useState(false);
  const [savingPass, setSavingPass]     = useState(false);

  // TMDB test
  const [testingTmdb, setTestingTmdb] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    const { data } = await ownerSupabase.from("panel_config").select("key, value");
    if (data) {
      const merged: Partial<PanelConfig> = {};
      for (const row of data) (merged as Record<string, unknown>)[row.key] = row.value;
      setConfig((c) => ({ ...c, ...merged }));
    }
    setLoading(false);
  }

  async function saveKey(key: keyof PanelConfig, value: unknown) {
    setSaving(key);
    try {
      const { error } = await ownerSupabase.from("panel_config").upsert({ key, value });
      if (error) throw error;
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
      toast.success("Guardado correctamente");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setSaving(null);
    }
  }

  async function handlePasswordChange() {
    if (!newPass || newPass.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    setSavingPass(true);
    try {
      const { error } = await ownerSupabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast.success("Contraseña actualizada");
      setNewPass("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error cambiando contraseña");
    } finally {
      setSavingPass(false);
    }
  }

  async function testTmdbKey() {
    const key = config.branding.tmdb_api_key?.trim();
    if (!key) { toast.error("Ingresa una API Key primero"); return; }
    setTestingTmdb(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${key}`
      );
      if (res.ok) {
        toast.success("API Key de TMDB válida ✓");
      } else {
        toast.error(`API Key inválida (${res.status})`);
      }
    } catch {
      toast.error("No se pudo conectar a TMDB");
    } finally {
      setTestingTmdb(false);
    }
  }

  function SaveButton({ sectionKey, label }: { sectionKey: keyof PanelConfig; label: string }) {
    const isSaving = saving === sectionKey;
    const isSaved  = savedKey === sectionKey;
    return (
      <Button
        size="sm"
        onClick={() => saveKey(sectionKey, config[sectionKey])}
        disabled={isSaving}
        className="bg-violet-600 hover:bg-violet-700 gap-2"
      >
        {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : isSaved ? <Check className="size-3.5" /> : null}
        {isSaving ? "Guardando…" : isSaved ? "Guardado" : label}
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  const creditsAvailable = reseller ? reseller.credits_total - reseller.credits_used : 0;

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Configuración</h1>

      {/* ── Mi cuenta ── */}
      <Section
        icon={<User className="size-4" />}
        title="Mi cuenta"
        description="Información de tu cuenta y seguridad."
      >
        {reseller && (
          <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{reseller.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[reseller.role] ?? "bg-zinc-100 text-zinc-600"}`}>
                {ROLE_LABEL[reseller.role] ?? reseller.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{reseller.email}</p>
            <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              <span>
                Créditos: <span className="font-semibold text-violet-600">{creditsAvailable.toLocaleString()}</span>
                <span className="text-muted-foreground/60"> / {reseller.credits_total.toLocaleString()}</span>
              </span>
              <span>·</span>
              <span>Demos este mes: <span className="font-medium">{reseller.demos_this_month}</span> / {reseller.demos_limit}</span>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Nueva contraseña</Label>
          <div className="relative">
            <Input
              type={showNewPass ? "text" : "password"}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowNewPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {newPass.length > 0 && newPass.length < 6 && (
            <p className="text-xs text-red-500">Mínimo 6 caracteres</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={handlePasswordChange}
          disabled={savingPass || !newPass || newPass.length < 6}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          {savingPass && <Loader2 className="size-3.5 animate-spin" />}
          Cambiar contraseña
        </Button>
      </Section>

      {/* ── Branding ── */}
      <Section
        icon={<Palette className="size-4" />}
        title="Branding"
        description="Personaliza el nombre y apariencia visual del panel."
      >
        <div className="space-y-1.5">
          <Label>Nombre del panel</Label>
          <Input
            value={config.branding.name}
            onChange={(e) => setConfig((c) => ({ ...c, branding: { ...c.branding, name: e.target.value } }))}
            placeholder="Mi Panel IPTV"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Color principal</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.branding.primary_color}
              onChange={(e) => setConfig((c) => ({ ...c, branding: { ...c.branding, primary_color: e.target.value } }))}
              className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
            />
            <Input
              value={config.branding.primary_color}
              onChange={(e) => setConfig((c) => ({ ...c, branding: { ...c.branding, primary_color: e.target.value } }))}
              className="w-32 font-mono"
              placeholder="#7C3AED"
            />
            {/* Live preview chip */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
              style={{ backgroundColor: config.branding.primary_color }}
            >
              {config.branding.name || "Panel"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>URL del logo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input
            value={config.branding.logo_url ?? ""}
            onChange={(e) => setConfig((c) => ({ ...c, branding: { ...c.branding, logo_url: e.target.value } }))}
            placeholder="https://..."
          />
          {config.branding.logo_url && (
            <img
              src={config.branding.logo_url}
              alt="Logo preview"
              className="h-10 rounded border border-border object-contain bg-muted px-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label>
            TMDB API Key{" "}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-xs text-violet-600 hover:underline font-normal"
            >
              Obtener key <ExternalLink className="size-3" />
            </a>
          </Label>
          <div className="flex gap-2">
            <Input
              value={config.branding.tmdb_api_key ?? ""}
              onChange={(e) => setConfig((c) => ({ ...c, branding: { ...c.branding, tmdb_api_key: e.target.value } }))}
              placeholder="Pega tu API key aquí"
              className="flex-1 font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={testTmdbKey}
              disabled={testingTmdb || !config.branding.tmdb_api_key}
            >
              {testingTmdb ? <Loader2 className="size-3.5 animate-spin" /> : "Probar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Necesaria para buscar películas y series en la sección VOD.</p>
        </div>

        <SaveButton sectionKey="branding" label="Guardar branding" />
      </Section>

      {/* ── Demo policy ── */}
      <Section
        icon={<FlaskConical className="size-4" />}
        title="Política de demos"
        description="Controla cuántas líneas demo se pueden crear en toda tu red por mes."
      >
        <div className="space-y-1.5">
          <Label>Límite global mensual de demos</Label>
          <Input
            type="number"
            min={0}
            value={config.demo_policy.global_monthly_limit}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                demo_policy: { global_monthly_limit: parseInt(e.target.value) || 0 },
              }))
            }
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Suma de demos de todos los resellers. Cada reseller tiene además su propio límite individual.
          </p>
        </div>
        <SaveButton sectionKey="demo_policy" label="Guardar política" />
      </Section>

      {/* ── Network depth ── */}
      <Section
        icon={<Network className="size-4" />}
        title="Control de red"
        description="Profundidad de la jerarquía de resellers (establecida por el administrador de licencias)."
      >
        <div className="space-y-1.5">
          <Label>Máximo de niveles de resellers</Label>
          <Input
            type="number"
            min={1}
            value={config.network_depth.max_levels ?? ""}
            className="max-w-xs"
            disabled
            placeholder="Sin configurar"
          />
          <p className="text-xs text-muted-foreground">
            {config.network_depth.max_levels == null
              ? "Sin límite configurado. Contacta al administrador de licencias para ajustar este valor."
              : `Máximo ${config.network_depth.max_levels} nivel${config.network_depth.max_levels !== 1 ? "es" : ""} de anidamiento (Owner → Reseller → Sub → …). Este valor es controlado por tu licencia.`}
          </p>
        </div>
      </Section>
    </div>
  );
}
