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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  Wifi,
  Copy,
  Server as ServerIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Server, ServerProtocol, ServerType } from "@/types/owner-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ServerType, string> = {
  live: "Live",
  vod: "VOD",
  hybrid: "Híbrido",
};
const TYPE_COLOR: Record<ServerType, string> = {
  live: "bg-blue-100 text-blue-700",
  vod: "bg-violet-100 text-violet-700",
  hybrid: "bg-emerald-100 text-emerald-700",
};

function serverUrl(s: Pick<Server, "protocol" | "ip" | "port">) {
  return `${s.protocol}://${s.ip}:${s.port}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("URL copiada al portapapeles"),
    () => toast.error("No se pudo copiar")
  );
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  ip: string;
  port: string;
  protocol: ServerProtocol;
  type: ServerType;
}

const EMPTY_FORM: FormState = {
  name: "",
  ip: "",
  port: "8080",
  protocol: "http",
  type: "hybrid",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Servers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Server | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await ownerSupabase.from("servers").select("*").order("created_at");
    setServers(data ?? []);
    setLoading(false);
  }

  const activeCount = useMemo(() => servers.filter((s) => s.status === "active").length, [servers]);
  const inactiveCount = servers.length - activeCount;

  // ── Sheet ─────────────────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(srv: Server) {
    setEditing(srv);
    setForm({
      name: srv.name,
      ip: srv.ip,
      port: String(srv.port),
      protocol: srv.protocol,
      type: srv.type,
    });
    setSheetOpen(true);
  }

  // ── Test connection ───────────────────────────────────────────────────────────

  async function testConnection() {
    setTesting(true);
    try {
      const url = `${form.protocol}://${form.ip}:${form.port}`;
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (res.ok || res.status < 500) {
        toast.success("Servidor responde correctamente");
      } else {
        toast.error(`El servidor respondió con error ${res.status}`);
      }
    } catch {
      toast.error("No se pudo conectar. Verifica IP y puerto.");
    } finally {
      setTesting(false);
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        ip: form.ip,
        port: parseInt(form.port) || 8080,
        protocol: form.protocol,
        type: form.type,
        status: editing?.status ?? "active",
      };
      if (editing) {
        const { error } = await ownerSupabase.from("servers").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Servidor actualizado");
      } else {
        const { error } = await ownerSupabase.from("servers").insert(payload);
        if (error) throw error;
        toast.success("Servidor agregado");
      }
      setSheetOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando servidor");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────────

  async function toggleStatus(srv: Server) {
    const newStatus = srv.status === "active" ? "inactive" : "active";
    await ownerSupabase.from("servers").update({ status: newStatus }).eq("id", srv.id);
    toast.success(newStatus === "active" ? "Servidor activado" : "Servidor desactivado");
    load();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("servers").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando servidor");
    } else {
      toast.success(`Servidor "${deleteTarget.name}" eliminado`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      load();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const previewUrl = form.ip && form.port ? serverUrl(form) : null;

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Servidores</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{servers.length}</span> servidor{servers.length !== 1 ? "es" : ""} ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos
              {inactiveCount > 0 && (
                <> · <span className="text-zinc-400 font-medium">{inactiveCount}</span> inactivo{inactiveCount > 1 ? "s" : ""}</>
              )}
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5 shrink-0"
        >
          <Plus className="size-4" /> Agregar servidor
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : servers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <ServerIcon className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay servidores. Agrega el VPS donde corre tu servidor IPTV.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {servers.map((srv) => (
                <tr
                  key={srv.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    srv.status !== "active" ? "opacity-50" : ""
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-3 font-medium text-foreground">{srv.name}</td>

                  {/* URL */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        {serverUrl(srv)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(serverUrl(srv))}
                        className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        title="Copiar URL"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[srv.type]}`}>
                      {TYPE_LABEL[srv.type]}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        srv.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {srv.status === "active" ? "Activo" : "Inactivo"}
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
                        <DropdownMenuItem onClick={() => openEdit(srv)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(serverUrl(srv))}>
                          <Copy className="size-3.5 mr-2" /> Copiar URL
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatus(srv)}>
                          {srv.status === "active" ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => { setDeleteTarget(srv); setDeleteConfirm(true); }}
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
            <SheetTitle>{editing ? "Editar servidor" : "Nuevo servidor"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Servidor Principal"
              />
            </div>
            {/* IP */}
            <div className="space-y-1.5">
              <Label>IP / Dominio</Label>
              <Input
                value={form.ip}
                onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                placeholder="192.168.1.1 o miservidor.com"
              />
            </div>
            {/* Port + Protocol row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Puerto</Label>
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Protocolo</Label>
                <Select
                  value={form.protocol}
                  onValueChange={(v) => setForm((f) => ({ ...f, protocol: v as ServerProtocol }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="rtmp">RTMP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as ServerType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live (solo canales)</SelectItem>
                  <SelectItem value="vod">VOD (solo películas/series)</SelectItem>
                  <SelectItem value="hybrid">Híbrido (live + VOD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* URL preview */}
            {previewUrl && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground break-all">
                {previewUrl}
              </div>
            )}
            {/* Test connection */}
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !form.ip || !form.port}
              className="w-full gap-2"
            >
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Wifi className="size-4" />}
              Probar conexión
            </Button>
            {/* Save */}
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.ip}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Agregar servidor"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar servidor?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>{" "}
              ({deleteTarget && serverUrl(deleteTarget)}). Las líneas asociadas perderán su servidor.
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
