import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Eye, Code2, AlertCircle } from "lucide-react";
import { ACTIVE_TEMPLATE_KEYS } from "./EmailTemplatesCard";

export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  html: string;
  variables: string[] | null;
  enabled: boolean;
};

const SAMPLE_VALUES: Record<string, string> = {
  owner_name: "Juan Pérez",
  owner_email: "juan@ejemplo.com",
  tenant_token: "abc123def456",
  deploy_url: "https://panel.ejemplo.com",
  recovery_url: "https://app.ejemplo.com/reset?token=xyz",
  plan: "Pro",
  expires_at: "31/12/2025",
  reason: "Falta de pago",
  days_left: "5",
};

function renderPreview(html: string, vars: string[] | null) {
  let out = html;
  const list = vars ?? Object.keys(SAMPLE_VALUES);
  for (const v of list) {
    const val = SAMPLE_VALUES[v] ?? `[${v}]`;
    out = out.split(`{{${v}}}`).join(val);
  }
  return out;
}

export default function EmailTemplateDialog({
  template,
  onClose,
  onSaved,
}: {
  template: EmailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setSubject(template.subject);
      setHtml(template.html);
    }
  }, [template]);

  if (!template) return null;

  const isActive = ACTIVE_TEMPLATE_KEYS.has(template.key);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ subject, html })
      .eq("id", template.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Plantilla actualizada");
      onSaved();
    }
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border">
          <DialogTitle>{template.name}</DialogTitle>
          {template.description && (
            <p className="text-xs text-muted-foreground">{template.description}</p>
          )}
        </DialogHeader>

        <div className="px-6 py-4 space-y-3 overflow-y-auto flex-1">
          {!isActive && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Esta plantilla aún no se envía automáticamente</p>
                <p className="text-warning/80 mt-0.5">
                  El disparador de envío está pendiente de implementación. Puedes previsualizarla pero los cambios no se guardarán.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Asunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!isActive} />
          </div>

          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
              <TabsTrigger value="preview" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Vista previa
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-1.5">
                <Code2 className="h-3.5 w-3.5" /> HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3">
              <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                <div className="border-b border-border bg-background px-4 py-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">Asunto:</strong>{" "}
                  {renderPreview(subject, template.variables)}
                </div>
                <div
                  className="bg-white p-4 max-h-[50vh] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: renderPreview(html, template.variables) }}
                />
              </div>
            </TabsContent>

            <TabsContent value="html" className="mt-3">
              <Textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="font-mono text-xs min-h-[40vh]"
                spellCheck={false}
                disabled={!isActive}
              />
            </TabsContent>
          </Tabs>

          {template.variables && template.variables.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Variables disponibles</p>
              <div className="flex flex-wrap gap-1.5">
                {template.variables.map((v) => (
                  <code
                    key={v}
                    className="text-xs bg-background border border-border px-1.5 py-0.5 rounded font-mono"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {isActive ? "Cancelar" : "Cerrar"}
          </Button>
          {isActive && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Guardar cambios
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
