import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2 } from "lucide-react";
import EmailTemplateDialog, { type EmailTemplate } from "./EmailTemplateDialog";

// Keys with a real edge function wired up. Others are shown as "Próximamente".
// - welcome: send-welcome-email (al crear/editar tenant)
// - password_recovery: send-auth-email (webhook de Supabase Auth en /forgot-password)
export const ACTIVE_TEMPLATE_KEYS = new Set<string>(["welcome", "password_recovery", "renewal", "panel_ready_credentials"]);

export default function EmailTemplatesCard() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<EmailTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("name", { ascending: true });
    setTemplates((data ?? []) as EmailTemplate[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Mail className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Plantillas de email</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Edita el contenido y vista previa de los emails que el sistema envía a los tenants.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No hay plantillas configuradas.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((t) => {
            const isActive = ACTIVE_TEMPLATE_KEYS.has(t.key);
            return (
              <Button
                key={t.id}
                variant="outline"
                className="justify-start h-auto py-3 px-3 text-left"
                onClick={() => setActive(t)}
              >
                <div className="flex flex-col items-start gap-1 min-w-0 w-full">
                  <div className="flex items-center gap-2 w-full min-w-0">
                    <span className="text-sm font-medium truncate flex-1">{t.name}</span>
                    {!isActive && (
                      <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                        Próximamente
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <span className="text-xs text-muted-foreground font-normal truncate w-full">
                      {t.description}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      )}

      <EmailTemplateDialog
        template={active}
        onClose={() => setActive(null)}
        onSaved={() => {
          setActive(null);
          load();
        }}
      />
    </div>
  );
}
