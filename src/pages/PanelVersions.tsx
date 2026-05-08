import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { GitBranch, Plus, Clock, ChevronRight, Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VersionStatus = "draft" | "deploying" | "published" | "failed" | "deprecated";

export interface PanelVersion {
  id: string;
  version_number: string;
  status: VersionStatus;
  release_notes: string | null;
  created_at: string;
  updated_at: string;
}

const GITHUB_BRANCH_URL = (version: string) =>
  `https://github.com/Humbold-Tech-Ou/LicenceManager-templates/tree/${version}`;

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<VersionStatus, { label: string; className: string }> = {
  draft:      { label: "Borrador",    className: "bg-muted text-muted-foreground border-border" },
  deploying:  { label: "Desplegando", className: "bg-blue-50 text-blue-600 border-blue-200" },
  published:  { label: "Publicado",   className: "bg-green-50 text-green-700 border-green-200" },
  failed:     { label: "Fallido",     className: "bg-red-50 text-red-600 border-red-200" },
  deprecated: { label: "Obsoleto",   className: "bg-orange-50 text-orange-600 border-orange-200" },
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
          <DialogDescription>
            Define el número de versión y las notas de lanzamiento. Se creará en estado Borrador.
          </DialogDescription>
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
  const [syncingId, setSyncingId] = useState<string | null>(null);
  // last commit URL per version, keyed by version id
  const [commitUrls, setCommitUrls] = useState<Record<string, string>>({});
  const [syncingBranches, setSyncingBranches] = useState(false);

  const handleSyncBranches = async () => {
    if (syncingBranches) return;
    setSyncingBranches(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-template-branches", {
        body: {},
      });
      if (error) throw new Error(error.message);
      const created = (data?.created ?? []) as Array<{ version_number: string }>;
      if (created.length === 0) {
        toast.info("No hay ramas nuevas para importar");
      } else {
        toast.success(`Importadas ${created.length} rama(s): ${created.map((c) => c.version_number).join(", ")}`);
        await fetchVersions();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar ramas");
    } finally {
      setSyncingBranches(false);
    }
  };

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
      setVersions((data ?? []) as unknown as PanelVersion[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  /** Sync a published version: inject config for every tenant assigned to it. */
  const handleSync = async (v: PanelVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (syncingId) return;
    setSyncingId(v.id);

    try {
      // Find all tenants assigned to this version
      const { data: tenants, error: tenantsErr } = await (supabase
        .from("tenants")
        .select("id, owner_name, owner_email") as any)
        .eq("panel_version_id", v.id);

      if (tenantsErr) throw new Error(tenantsErr.message);

      if (!tenants || tenants.length === 0) {
        toast.info(`No hay tenants asignados a ${v.version_number}`);
        setSyncingId(null);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) throw new Error("No hay sesión activa");

      let lastCommitUrl = "";
      let successCount = 0;

      for (const tenant of tenants) {
        const res = await supabase.functions.invoke("inject-tenant-config", {
          body: { tenant_id: tenant.id, version: v.version_number },
        });
        if (res.error) {
          toast.error(`Error con ${tenant.owner_name ?? tenant.owner_email}: ${res.error.message}`);
        } else {
          successCount++;
          lastCommitUrl = res.data?.commit_url ?? lastCommitUrl;
        }
      }

      if (successCount > 0) {
        toast.success(
          `${v.version_number} sincronizado — ${successCount}/${tenants.length} tenant(s)`
        );
        if (lastCommitUrl) {
          setCommitUrls((prev) => ({ ...prev, [v.id]: lastCommitUrl }));
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncingId(null);
    }
  };

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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={handleSyncBranches}
                  disabled={syncingBranches}
                  title="Importa ramas del repo de templates que aún no estén registradas como versiones"
                >
                  {syncingBranches ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                  Sincronizar ramas
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
                  <Plus className="size-3.5" />
                  Crear Nueva Versión
                </Button>
              </div>
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
                      {versions.map((v) => {
                        const isSyncing = syncingId === v.id;
                        const commitUrl = commitUrls[v.id];
                        const ghBranchUrl = GITHUB_BRANCH_URL(v.version_number);
                        return (
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <VersionStatusBadge status={v.status} />
                                {v.status === "published" && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                                          disabled={!!syncingId}
                                          onClick={(e) => handleSync(v, e)}
                                        >
                                          {isSyncing
                                            ? <Loader2 className="size-3 animate-spin" />
                                            : <RefreshCw className="size-3" />}
                                          {isSyncing ? "Sincronizando…" : "Sincronizar"}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        Inyectar config en LicenceManager-templates
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={commitUrl ?? ghBranchUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <ExternalLink className="size-3" />
                                          {commitUrl ? "Ver commit" : "Ver en GitHub"}
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        {commitUrl ?? ghBranchUrl}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-muted-foreground">
                              {format(parseISO(v.updated_at), "dd/MM/yyyy · HH:mm", { locale: es })}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <ChevronRight className="size-4 text-muted-foreground inline group-hover:text-primary transition-colors" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <div className="sm:hidden divide-y divide-border">
                  {versions.map((v) => {
                    const isSyncing = syncingId === v.id;
                    const commitUrl = commitUrls[v.id];
                    return (
                      <div
                        key={v.id}
                        onClick={() => navigate(`/versions/${v.id}`)}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground font-mono">{v.version_number}</span>
                            <VersionStatusBadge status={v.status} />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {format(parseISO(v.updated_at), "dd/MM/yyyy", { locale: es })}
                            </span>
                            {v.status === "published" && (
                              <>
                                <button
                                  className="flex items-center gap-1 text-blue-600 font-medium"
                                  disabled={!!syncingId}
                                  onClick={(e) => handleSync(v, e)}
                                >
                                  {isSyncing
                                    ? <Loader2 className="size-3 animate-spin" />
                                    : <RefreshCw className="size-3" />}
                                  {isSyncing ? "Sincronizando…" : "Sincronizar"}
                                </button>
                                <a
                                  href={commitUrl ?? GITHUB_BRANCH_URL(v.version_number)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <ExternalLink className="size-3" />
                                  {commitUrl ? "Ver commit" : "GitHub"}
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
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
