import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/helpers";
import StatusBadge from "@/components/tenants/StatusBadge";
import PlanBadge from "@/components/tenants/PlanBadge";
import { OnboardingSteps } from "@/components/tenants/OnboardingProgress";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function TenantPortal() {
  const { tenant, signOut } = useAuth();
  const navigate = useNavigate();

  if (!tenant) return null;

  const daysLeft = differenceInDays(new Date(tenant.expires_at), new Date());

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {tenant.owner_name ? `Hola, ${tenant.owner_name}` : "Mi panel"}
            </h1>
            <p className="text-sm text-muted-foreground">{tenant.owner_email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>

        {/* Status card */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Estado de tu licencia</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Plan</p>
              <PlanBadge plan={tenant.plan} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Estado</p>
              <StatusBadge status={tenant.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Expira</p>
              <p className="text-foreground">{format(new Date(tenant.expires_at), "d MMM yyyy", { locale: es })}</p>
              <p className={`text-xs mt-0.5 ${daysLeft < 7 ? "text-destructive" : "text-muted-foreground"}`}>
                {daysLeft > 0 ? `en ${daysLeft} días` : "Expirado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Token</p>
              <div className="flex items-center gap-1.5">
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground truncate max-w-[140px]">
                  {tenant.tenant_token}
                </code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(tenant.tenant_token);
                    } catch {
                      const el = document.createElement("textarea");
                      el.value = tenant.tenant_token;
                      document.body.appendChild(el);
                      el.select();
                      document.execCommand("copy");
                      document.body.removeChild(el);
                    }
                    toast.success("Token copiado");
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Deploy card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Tu panel IPTV</h2>
          {tenant.deploy_url ? (
            <div className="space-y-2">
              <span className="inline-flex items-center rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-xs font-medium">
                Activo
              </span>
              <div>
                <a
                  href={tenant.deploy_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {tenant.deploy_url}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : tenant.onboarding_done ? (
            <div className="space-y-1.5">
              <span className="inline-flex items-center rounded-full bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 text-xs font-medium">
                Desplegando...
              </span>
              <p className="text-sm text-muted-foreground">Tu panel está siendo configurado. En breve estará listo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Tu panel aún no está configurado. Completa el onboarding para activarlo.
              </p>
              <Button size="sm" onClick={() => navigate(`/onboarding/${tenant.id}`)}>
                Iniciar configuración →
              </Button>
            </div>
          )}
        </div>

        {/* Onboarding progress */}
        {!tenant.onboarding_done && (
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Progreso de configuración</h2>
              <span className="text-xs text-muted-foreground">
                Paso {tenant.onboarding_step ?? 0} de 7
              </span>
            </div>
            <OnboardingSteps step={tenant.onboarding_step ?? 0} done={false} />
          </div>
        )}

      </div>
    </div>
  );
}
