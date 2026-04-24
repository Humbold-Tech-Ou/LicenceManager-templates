import { useEffect, useState } from "react";
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
import { VersionStatusBadge, type PanelVersion } from "@/pages/PanelVersions";

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanelVersionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [version, setVersion] = useState<PanelVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          setVersion(data as PanelVersion);
        }
        setLoading(false);
      });
  }, [id]);

  // ── Publish via Edge Function (triggers GitHub Actions + DB update) ──────────

  async function publishVersion() {
    if (!version) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("publish-version", {
        body: { version_number: version.version_number, record_id: version.id },
      });

      if (error) throw error;

      if (data?.warning) {
        toast.warning(`Workflow disparado, pero: ${data.warning}`);
      } else {
        toast.success(`¡Versión ${version.version_number} publicada! 🚀 El workflow de GitHub Actions está en marcha.`);
      }

      // Refresh from DB to reflect the new status
      const { data: updated } = await supabase
        .from("panel_versions" as any)
        .select("*")
        .eq("id", version.id)
        .single();
      if (updated) setVersion(updated as PanelVersion);

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

  // ── Refresh updated_at (for already-published versions) ───────────────────

  async function refreshVersion() {
    if (!version) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("panel_versions" as any)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", version.id)
      .select()
      .single();

    if (error) {
      toast.error("Error al actualizar");
    } else {
      setVersion(data as PanelVersion);
      toast.success("Versión actualizada");
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
            <div className="flex items-center gap-3 bg-muted/60 border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="size-3 rounded-full bg-red-400/70" />
                <div className="size-3 rounded-full bg-yellow-400/70" />
                <div className="size-3 rounded-full bg-green-400/70" />
              </div>
              <div className="flex-1 min-w-0 bg-background/80 rounded-md border border-border/70 px-3 py-1 text-xs text-muted-foreground font-mono truncate">
                vivacore-panel.vercel.app
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/80 transition-colors">
                  <RotateCcw className="size-3.5" />
                </button>
                <a
                  href="https://vivacore-panel.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            {/* iframe */}
            <iframe
              title={`Vista previa ${version.version_number}`}
              srcDoc={`<!DOCTYPE html>
<html style="margin:0;height:100%;font-family:system-ui,sans-serif;background:#f9fafb;">
<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:#6b7280;margin:0;">
  <div style="font-size:40px;line-height:1">🖥️</div>
  <div style="font-size:15px;font-weight:600;color:#374151;">Vista previa · ${version.version_number}</div>
  <div style="font-size:12px;text-align:center;max-width:280px;line-height:1.6;">
    Conecta el repositorio de esta versión para habilitar la vista previa en vivo.
  </div>
  <div style="margin-top:8px;padding:4px 14px;background:#ede9fe;color:#7c3aed;border-radius:999px;font-size:11px;font-weight:500;">
    ${version.status === "draft" ? "Borrador — pendiente de publicación" : version.status === "published" ? "Versión activa" : "Versión obsoleta"}
  </div>
</body>
</html>`}
              className="w-full border-0 bg-muted/20"
              style={{ height: 480 }}
              sandbox="allow-scripts"
            />
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

              {version.status === "published" && (
                <div className="flex flex-col items-stretch gap-1">
                  <Button
                    className="w-full gap-2"
                    onClick={refreshVersion}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Actualizar
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Última Act. {formattedDate}
                  </p>
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
    </>
  );
}
