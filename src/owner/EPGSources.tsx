import { useEffect, useState, useMemo } from "react";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import type { EpgSource } from "@/types/owner-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateUrl(url: string, max = 50) {
  return url.length > max ? url.slice(0, max) + "..." : url;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Nunca";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  url: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  url: "",
  active: true,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function EPGSources() {
  const [sources, setSources] = useState<EpgSource[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EpgSource | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<EpgSource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await ownerSupabase
      .from("epg_sources")
      .select("*")
      .order("created_at");
    setSources(data ?? []);
    setLoading(false);
  }

  const activeCount = useMemo(
    () => sources.filter((s) => s.active).length,
    [sources]
  );

  // ── Sheet ─────────────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(src: EpgSource) {
    setEditing(src);
    setForm({
      name: src.name,
      url: src.url,
      active: src.active,
    });
    setSheetOpen(true);
  }

  // ── Test URL ──────────────────────────────────────────────────────────────────

  async function testUrl() {
    setTesting(true);
    try {
      const res = await fetch(form.url, {
        signal: AbortSignal.timeout(8000),
        headers: { Range: "bytes=0-499" },
      });
      const text = await res.text();
      const snippet = text.slice(0, 500).toLowerCase();
      if (snippet.includes("<?xml") || snippet.includes("<tv")) {
        toast.success("URL válida — responde con XML/XMLTV");
      } else {
        toast.error("La URL no parece devolver XMLTV válido");
      }
    } catch {
      toast.error("No se pudo conectar a la URL. Verifica que sea accesible.");
    } finally {
      setTesting(false);
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        url: form.url,
        active: form.active,
      };
      if (editing) {
        const { error } = await ownerSupabase
          .from("epg_sources")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Fuente EPG actualizada");
      } else {
        const { error } = await ownerSupabase
          .from("epg_sources")
          .insert(payload);
        if (error) throw error;
        toast.success("Fuente EPG creada");
      }
      setSheetOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando fuente EPG");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  async function toggleActive(src: EpgSource) {
    const newActive = !src.active;
    await ownerSupabase.from("epg_sources").update({ active: newActive }).eq("id", src.id);
    toast.success(newActive ? "Fuente activada" : "Fuente desactivada");
    load();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase
      .from("epg_sources")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando fuente EPG");
    } else {
      toast.success(`Fuente "${deleteTarget.name}" eliminada`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      load();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Fuentes EPG</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{sources.length}</span> fuente{sources.length !== 1 ? "s" : ""} EPG ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activa{activeCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5 shrink-0"
        >
          <Plus className="size-4" /> Agregar fuente
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <CalendarDays className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay fuentes EPG. Añade la primera.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Última sync</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sources.map((src) => (
                <tr
                  key={src.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    !src.active ? "opacity-50" : ""
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-foreground">{src.name}</td>

                  {/* URL */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {truncateUrl(src.url)}
                    </span>
                  </td>

                  {/* Last sync */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {relativeTime(src.last_sync)}
                  </td>

                  {/* Active status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        src.active
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {src.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(src)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleActive(src)}>
                          {src.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => { setDeleteTarget(src); setDeleteConfirm(true); }}
                        >
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar fuente EPG" : "Nueva fuente EPG"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="EPG Principal"
              />
            </div>
            {/* URL */}
            <div className="space-y-1.5">
              <Label>URL (XMLTV)</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://epg.ejemplo.com/guide.xml"
              />
            </div>
            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label>Activa</Label>
              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  form.active ? "bg-violet-600" : "bg-zinc-200"
                }`}
              >
                <span
                  className={`pointer-events-none block size-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    form.active ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {/* Test URL */}
            <Button
              variant="outline"
              onClick={testUrl}
              disabled={testing || !form.url}
              className="w-full gap-2"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}
              Probar URL
            </Button>
            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.url}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Agregar fuente"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar fuente EPG?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>.
              Los canales asociados perderán su guía de programación.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
