import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { GitBranch, Plus, Users, Clock, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VersionStatus = "draft" | "published" | "deprecated";

export interface PanelVersion {
  id: string;
  version_number: string;
  status: VersionStatus;
  release_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VersionStatus, { label: string; className: string }> = {
  draft:      { label: "Borrador",  className: "bg-muted text-muted-foreground border-border" },
  published:  { label: "Publicado", className: "bg-green-50 text-green-700 border-green-200" },
  deprecated: { label: "Obsoleto",  className: "bg-red-50 text-red-600 border-red-200" },
};

export function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </Badge>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Create version modal ──────────────────────────────────────────────────────

interface CreateVersionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateVersionDialog({ open, onClose, onCreated }: CreateVersionDialogProps) {
  const [versionNumber, setVersionNumber] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (saving) return;
    setVersionNumber("");
    setReleaseNotes("");
    onClose();
  };

  const handleSave = async () => {
    const trimmed = versionNumber.trim();
    if (!trimmed) { toast.error("Ingresa un número de versión"); return; }

    setSaving(true);
    const { error } = await supabase
      .from("panel_versions" as any)
      .insert({ version_number: trimmed, release_notes: releaseNotes.trim() || null });

    if (error) {
      toast.error(error.message.includes("unique") ? "Esa versión ya existe" : error.message);
    } else {
      toast.success(`Versión ${trimmed} creada`);
      setVersionNumber("");
      setReleaseNotes("");
      onCreated();
      onClose();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear Nueva Versión</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="version-number">Número de versión</Label>
            <Input
              id="version-number"
              placeholder="ej. v1.2.0"
              value={versionNumber}
              onChange={(e) => setVersionNumber(e.target.value)}
              className="font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="release-notes">
              Notas de lanzamiento{" "}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="release-notes"
              placeholder={"- Mejora A\n- Corrección de bug B\n- Nueva funcionalidad C"}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              rows={5}
              className="text-sm resize-none"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            La versión se creará en estado <span className="font-medium text-foreground">Borrador</span>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !versionNumber.trim()} className="gap-2">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Crear versión
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PanelVersions() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<PanelVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("panel_versions" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setVersions((data ?? []) as PanelVersion[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const published  = versions.filter((v) => v.status === "published");
  const drafts     = versions.filter((v) => v.status === "draft");

  return (
    <>
      <Topbar title="Versiones de Panel" />

      <div className="p-4 sm:p-6 space-y-6 animate-fade-in">

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MetricCard label="Total versiones" value={loading ? "—" : versions.length} />
          <MetricCard label="Publicadas"       value={loading ? "—" : published.length} />
          <MetricCard label="Borradores"       value={loading ? "—" : drafts.length} />
        </div>

        {/* ── Table card ── */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="size-4 text-primary" />
                Historial de versiones
              </CardTitle>
              <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
                <Plus className="size-3.5" />
                Crear Nueva Versión
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Cargando versiones...</span>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <AlertCircle className="size-8 text-destructive/60" />
                <p className="text-sm">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchVersions}>Reintentar</Button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && versions.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <GitBranch className="size-8 opacity-30" />
                <p className="text-sm">No hay versiones creadas aún.</p>
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" /> Crear primera versión
                </Button>
              </div>
            )}

            {/* Desktop table */}
            {!loading && !error && versions.length > 0 && (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Versión</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Última actualización</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {versions.map((v) => (
                        <tr
                          key={v.id}
                          onClick={() => navigate(`/versions/${v.id}`)}
                          className="cursor-pointer hover:bg-muted/30 transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <span className="font-semibold font-mono text-foreground group-hover:text-primary transition-colors">
                              {v.version_number}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <VersionStatusBadge status={v.status} />
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            {format(parseISO(v.updated_at), "dd/MM/yyyy · HH:mm", { locale: es })}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <ChevronRight className="size-4 text-muted-foreground inline group-hover:text-primary transition-colors" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-border">
                  {versions.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => navigate(`/versions/${v.id}`)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground font-mono">{v.version_number}</span>
                          <VersionStatusBadge status={v.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {format(parseISO(v.updated_at), "dd/MM/yyyy", { locale: es })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateVersionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={fetchVersions}
      />
    </>
  );
}
