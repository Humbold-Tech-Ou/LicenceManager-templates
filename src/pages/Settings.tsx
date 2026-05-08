import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Topbar from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExternalLink, Check, Eye, EyeOff } from "lucide-react";
import EmailTemplatesCard from "@/components/settings/EmailTemplatesCard";

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [saving, setSaving] = useState(false);

  const [panelVersion, setPanelVersion] = useState("latest");
  const [updating, setUpdating] = useState(false);
  const [confirmForceUpdate, setConfirmForceUpdate] = useState(false);

  const handleForceUpdate = async () => {
    setUpdating(true);
    const { error } = await supabase
      .from("tenants")
      .update({ panel_version: panelVersion })
      .not("id", "is", null);
    if (error) toast.error(error.message);
    else toast.success(`Todos los tenants actualizados a "${panelVersion}"`);
    setUpdating(false);
    setConfirmForceUpdate(false);
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error("Las contraseñas no coinciden"); return; }
    if (newPass.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) toast.error(error.message);
    else { toast.success("Contraseña actualizada"); setCurrentPass(""); setNewPass(""); setConfirmPass(""); }
    setSaving(false);
  };

  const envVars = [
    "SUPABASE_OAUTH_CLIENT_ID",
    "SUPABASE_OAUTH_CLIENT_SECRET",
    "VERCEL_OAUTH_CLIENT_ID",
    "VERCEL_OAUTH_CLIENT_SECRET",
    "CLOUDFLARE_OAUTH_CLIENT_ID",
    "CLOUDFLARE_OAUTH_CLIENT_SECRET",
    "GITHUB_REPO_OWNER",
    "GITHUB_REPO_NAME",
    "RESEND_API_KEY",
    "APP_BASE_URL",
  ];

  return (
    <>
      <Topbar title="Configuración" />
      <div className="w-full max-w-3xl p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Account */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Mi cuenta</h2>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <form onSubmit={handleChangePass} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contraseña actual</Label>
                <div className="relative">
                  <Input type={showCurrentPass ? "text" : "password"} value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} className="pr-9" />
                  <button type="button" onClick={() => setShowCurrentPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCurrentPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                <div className="relative">
                  <Input type={showNewPass ? "text" : "password"} value={newPass} onChange={(e) => setNewPass(e.target.value)} className="pr-9" />
                  <button type="button" onClick={() => setShowNewPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Confirmar contraseña</Label>
                <div className="relative">
                  <Input type={showConfirmPass ? "text" : "password"} value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="pr-9" />
                  <button type="button" onClick={() => setShowConfirmPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirmPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? "Guardando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </div>

        {/* Email templates */}
        <EmailTemplatesCard />

        {/* OAuth */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Configuración OAuth</h2>
          <p className="text-sm text-muted-foreground">Configura las apps OAuth necesarias para los flujos de onboarding de los tenants.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <a href="https://supabase.com/dashboard/account/oauth-apps" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Supabase OAuth Apps</span>
            </a>
            <a href="https://vercel.com/account/oauth" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Vercel OAuth</span>
            </a>
            <a href="https://developers.cloudflare.com/fundamentals/api/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Cloudflare API</span>
            </a>
          </div>
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Variables requeridas en Edge Functions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {envVars.map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs min-w-0">
                  <Check className="h-3 w-3 text-muted-foreground shrink-0" />
                  <code className="font-mono text-foreground truncate">{v}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel version */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Versión del panel</h2>
          <p className="text-sm text-muted-foreground">
            Fuerza la versión del panel del cliente para todos los tenants activos. Usa <code className="font-mono text-xs">latest</code> para que siempre descarguen la versión más reciente.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="space-y-1.5 flex-1 sm:max-w-xs">
              <Label className="text-xs text-muted-foreground">Versión objetivo</Label>
              <Input
                value={panelVersion}
                onChange={(e) => setPanelVersion(e.target.value)}
                placeholder="latest"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmForceUpdate(true)}
              disabled={!panelVersion.trim()}
              className="w-full sm:w-auto"
            >
              Forzar actualización a todos
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmForceUpdate} onOpenChange={setConfirmForceUpdate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Forzar actualización?</AlertDialogTitle>
            <AlertDialogDescription>
              Se actualizará <code className="font-mono text-xs">panel_version</code> a{" "}
              <strong>"{panelVersion}"</strong> en todos los tenants. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceUpdate} disabled={updating}>
              {updating ? "Actualizando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
