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
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import type { Server, ServerProtocol, ServerType, SshAuthMethod } from "@/types/owner-panel";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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
  if (s.protocol === "ssh") return `ssh://${s.ip}:${s.port}`;
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
  geo_countries: string;
  isp_whitelist: string;
  ssh_username: string;
  ssh_auth_method: SshAuthMethod;
  ssh_password: string;
  ssh_private_key: string;
  ssh_passphrase: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  ip: "",
  port: "8080",
  protocol: "http",
  type: "hybrid",
  geo_countries: "",
  isp_whitelist: "",
  ssh_username: "",
  ssh_auth_method: "password",
  ssh_password: "",
  ssh_private_key: "",
  ssh_passphrase: "",
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
      geo_countries: (srv.geo_countries ?? []).join(", "),
      isp_whitelist: (srv.isp_whitelist ?? []).join(", "),
      ssh_username: srv.ssh_username ?? "",
      ssh_auth_method: (srv.ssh_auth_method ?? "password") as SshAuthMethod,
      ssh_password: "",
      ssh_private_key: "",
      ssh_passphrase: "",
    });
    setSheetOpen(true);
  }

  // ── Test connection ───────────────────────────────────────────────────────────

  async function testConnection() {
    setTesting(true);
    try {
      if (form.protocol === "ssh") {
        const SUPABASE_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";
        if (!form.ssh_username) {
          toast.error("Falta el usuario SSH");
          return;
        }
        if (form.ssh_auth_method === "password" && !form.ssh_password) {
          toast.error("Falta la contraseña SSH");
          return;
        }
        if (form.ssh_auth_method === "key" && !form.ssh_private_key) {
          toast.error("Falta la clave privada");
          return;
        }
        const res = await fetch(`${SUPABASE_URL}/functions/v1/test-ssh-connection`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            host: form.ip,
            port: parseInt(form.port) || 22,
            username: form.ssh_username,
            ...(form.ssh_auth_method === "password"
              ? { password: form.ssh_password }
              : { private_key: form.ssh_private_key, passphrase: form.ssh_passphrase || undefined }),
          }),
          signal: AbortSignal.timeout(20000),
        });
        const data = await res.json();
        if (data?.ok) {
          toast.success("SSH conectó correctamente", {
            description: data.info ? data.info.slice(0, 140) : undefined,
          });
        } else {
          toast.error("SSH falló", { description: data?.error ?? "Error desconocido" });
        }
        return;
      }
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
      const geoArr = form.geo_countries.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const ispArr = form.isp_whitelist.split(",").map((s) => s.trim()).filter(Boolean);
      const isSsh = form.protocol === "ssh";
      const payload: Record<string, unknown> = {
        name: form.name,
        ip: form.ip,
        port: parseInt(form.port) || (isSsh ? 22 : 8080),
        protocol: form.protocol,
        type: form.type,
        status: editing?.status ?? "active",
        geo_countries: geoArr.length > 0 ? geoArr : null,
        isp_whitelist: ispArr.length > 0 ? ispArr : null,
        ssh_username: isSsh ? form.ssh_username || null : null,
        ssh_auth_method: isSsh ? form.ssh_auth_method : null,
      };
      let serverId: string | undefined;
      if (editing) {
        const { error } = await ownerSupabase.from("servers").update(payload).eq("id", editing.id);
        if (error) throw error;
        serverId = editing.id;
        toast.success("Servidor actualizado");
      } else {
        const { data, error } = await ownerSupabase
          .from("servers")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        serverId = (data as { id: string } | null)?.id;
        toast.success("Servidor agregado");
      }

      // Persist SSH secret in Vault (only when user provided a new value)
      if (isSsh && serverId) {
        const secret =
          form.ssh_auth_method === "password"
            ? form.ssh_password
            : form.ssh_private_key;
        if (secret) {
          const { error: secErr } = await ownerSupabase.rpc("set_server_ssh_secret", {
            _server_id: serverId,
            _secret: secret,
          });
          if (secErr) {
            toast.warning("Servidor guardado, pero falló guardar la clave SSH", {
              description: secErr.message,
            });
          }
        }
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

  const previewUrl = form.ip && form.port
    ? serverUrl({ ...form, port: Number(form.port) })
    : null;

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
                <th className="px-4 py-3 font-medium hidden lg:table-cell">GeoIP</th>
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

                  {/* GeoIP */}
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {srv.geo_countries && srv.geo_countries.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {srv.geo_countries.slice(0, 3).join(", ")}
                        {srv.geo_countries.length > 3 && ` +${srv.geo_countries.length - 3}`}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Todos</span>
                    )}
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
                  onValueChange={(v) => {
                    const next = v as ServerProtocol;
                    setForm((f) => ({
                      ...f,
                      protocol: next,
                      // sensible default port when switching to/from ssh
                      port:
                        next === "ssh" && (f.port === "8080" || f.port === "80" || f.port === "443")
                          ? "22"
                          : next !== "ssh" && f.port === "22"
                          ? "8080"
                          : f.port,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP</SelectItem>
                    <SelectItem value="https">HTTPS</SelectItem>
                    <SelectItem value="rtmp">RTMP</SelectItem>
                    <SelectItem value="ssh">SSH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* SSH credentials block */}
            {form.protocol === "ssh" && (
              <div className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                  <KeyRound className="size-3.5" />
                  Credenciales SSH
                </div>
                <div className="space-y-1.5">
                  <Label>Usuario SSH</Label>
                  <Input
                    value={form.ssh_username}
                    onChange={(e) => setForm((f) => ({ ...f, ssh_username: e.target.value }))}
                    placeholder="root"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Método de autenticación</Label>
                  <RadioGroup
                    value={form.ssh_auth_method}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, ssh_auth_method: v as SshAuthMethod }))
                    }
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="password" id="ssh-pwd" />
                      <Label htmlFor="ssh-pwd" className="font-normal cursor-pointer">
                        Contraseña
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="key" id="ssh-key" />
                      <Label htmlFor="ssh-key" className="font-normal cursor-pointer">
                        Clave privada
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                {form.ssh_auth_method === "password" ? (
                  <div className="space-y-1.5">
                    <Label>Contraseña</Label>
                    <Input
                      type="password"
                      value={form.ssh_password}
                      onChange={(e) => setForm((f) => ({ ...f, ssh_password: e.target.value }))}
                      placeholder={editing ? "Dejar vacío para no cambiar" : "••••••••"}
                      autoComplete="new-password"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Clave privada (PEM)</Label>
                      <Textarea
                        rows={5}
                        value={form.ssh_private_key}
                        onChange={(e) => setForm((f) => ({ ...f, ssh_private_key: e.target.value }))}
                        placeholder={
                          editing
                            ? "Dejar vacío para no cambiar"
                            : "-----BEGIN OPENSSH PRIVATE KEY-----\n..."
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Passphrase (opcional)</Label>
                      <Input
                        type="password"
                        value={form.ssh_passphrase}
                        onChange={(e) => setForm((f) => ({ ...f, ssh_passphrase: e.target.value }))}
                        autoComplete="new-password"
                      />
                    </div>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  La contraseña/clave se guarda cifrada en Supabase Vault. Nadie del panel puede verla en texto plano.
                </p>
              </div>
            )}
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
            {/* GeoIP countries */}
            <div className="space-y-1.5">
              <Label>Países permitidos (GeoIP)</Label>
              <Input
                value={form.geo_countries}
                onChange={(e) => setForm((f) => ({ ...f, geo_countries: e.target.value }))}
                placeholder="VE, CO, MX, US (vacío = todos)"
              />
              <p className="text-xs text-muted-foreground">
                Códigos ISO separados por coma. Vacío permite todos los países.
              </p>
            </div>
            {/* ISP whitelist */}
            <div className="space-y-1.5">
              <Label>ISP permitidos</Label>
              <Input
                value={form.isp_whitelist}
                onChange={(e) => setForm((f) => ({ ...f, isp_whitelist: e.target.value }))}
                placeholder="CANTV, Movistar (vacío = todos)"
              />
              <p className="text-xs text-muted-foreground">
                Nombres de ISP separados por coma. Vacío permite todos.
              </p>
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
