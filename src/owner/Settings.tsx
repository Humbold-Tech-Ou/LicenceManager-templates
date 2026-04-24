import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PanelConfig } from "@/types/owner-panel";

export default function Settings() {
  const { reseller } = useOwnerAuth();
  const [config, setConfig] = useState<PanelConfig>({
    branding: { name: "Mi Panel IPTV", primary_color: "#7C3AED" },
    demo_policy: { global_monthly_limit: 50 },
    network_depth: { max_levels: null },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Password change
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [savingPass, setSavingPass] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const { data } = await ownerSupabase.from("panel_config").select("key, value");
    if (data) {
      const merged: Partial<PanelConfig> = {};
      for (const row of data) {
        (merged as Record<string, unknown>)[row.key] = row.value;
      }
      setConfig((c) => ({ ...c, ...merged }));
    }
    setLoading(false);
  }

  async function saveKey(key: keyof PanelConfig, value: unknown) {
    setSaving(key);
    try {
      const { error } = await ownerSupabase
        .from("panel_config")
        .upsert({ key, value });
      if (error) throw error;
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
      setCurrentPass("");
      setNewPass("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error cambiando contraseña");
    } finally {
      setSavingPass(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-lg font-semibold text-foreground">Configuración</h1>

      {/* Branding */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Branding</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre del panel</Label>
            <Input
              value={config.branding.name}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  branding: { ...c.branding, name: e.target.value },
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color principal</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.branding.primary_color}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    branding: { ...c.branding, primary_color: e.target.value },
                  }))
                }
                className="h-9 w-14 rounded border border-input cursor-pointer"
              />
              <Input
                value={config.branding.primary_color}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    branding: { ...c.branding, primary_color: e.target.value },
                  }))
                }
                className="w-32 font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL del logo (opcional)</Label>
            <Input
              value={config.branding.logo_url ?? ""}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  branding: { ...c.branding, logo_url: e.target.value },
                }))
              }
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>TMDB API Key (para VOD)</Label>
            <Input
              value={config.branding.tmdb_api_key ?? ""}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  branding: { ...c.branding, tmdb_api_key: e.target.value },
                }))
              }
              placeholder="Obtén tu key en themoviedb.org"
            />
          </div>
          <Button
            size="sm"
            onClick={() => saveKey("branding", config.branding)}
            disabled={saving === "branding"}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {saving === "branding" && <Loader2 className="size-3.5 animate-spin" />}
            Guardar branding
          </Button>
        </div>
      </section>

      {/* Demo policy */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Política de demos</h2>
        <div className="space-y-1.5">
          <Label>Límite global mensual de demos</Label>
          <Input
            type="number"
            min={0}
            value={config.demo_policy.global_monthly_limit}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                demo_policy: {
                  global_monthly_limit: parseInt(e.target.value) || 0,
                },
              }))
            }
            className="max-w-xs"
          />
        </div>
        <Button
          size="sm"
          onClick={() => saveKey("demo_policy", config.demo_policy)}
          disabled={saving === "demo_policy"}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          {saving === "demo_policy" && <Loader2 className="size-3.5 animate-spin" />}
          Guardar política
        </Button>
      </section>

      {/* Network depth */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Control de red</h2>
        <div className="space-y-1.5">
          <Label>Máximo de niveles de resellers (vacío = ilimitado)</Label>
          <Input
            type="number"
            min={0}
            value={config.network_depth.max_levels ?? ""}
            onChange={(e) =>
              setConfig((c) => ({
                ...c,
                network_depth: {
                  max_levels: e.target.value ? parseInt(e.target.value) : null,
                },
              }))
            }
            className="max-w-xs"
            placeholder="Ilimitado"
          />
        </div>
        <Button
          size="sm"
          onClick={() => saveKey("network_depth", config.network_depth)}
          disabled={saving === "network_depth"}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          {saving === "network_depth" && <Loader2 className="size-3.5 animate-spin" />}
          Guardar configuración
        </Button>
      </section>

      {/* Password change */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Mi cuenta</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <Button
            size="sm"
            onClick={handlePasswordChange}
            disabled={savingPass || !newPass}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            {savingPass && <Loader2 className="size-3.5 animate-spin" />}
            Cambiar contraseña
          </Button>
        </div>
      </section>
    </div>
  );
}
