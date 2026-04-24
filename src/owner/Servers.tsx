import { useEffect, useState } from "react";
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
import { Loader2, Plus, Pencil, Wifi } from "lucide-react";
import { toast } from "sonner";
import type { Server, ServerProtocol, ServerType } from "@/types/owner-panel";

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
  type: "live",
};

export default function Servers() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Server | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await ownerSupabase
      .from("servers")
      .select("*")
      .order("created_at");
    setServers(data ?? []);
    setLoading(false);
  }

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
      toast.error("No se pudo conectar al servidor. Verifica IP y puerto.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        ip: form.ip,
        port: parseInt(form.port) || 8080,
        protocol: form.protocol,
        type: form.type,
        status: "active",
      };

      if (editing) {
        const { error } = await ownerSupabase
          .from("servers")
          .update(payload)
          .eq("id", editing.id);
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

  const TYPE_LABEL: Record<ServerType, string> = {
    live: "Live",
    vod: "VOD",
    hybrid: "Híbrido",
  };

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Servidores</h1>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Plus className="size-4" /> Agregar servidor
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : servers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
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
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Puerto</th>
                <th className="px-4 py-3 font-medium">Protocolo</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {servers.map((srv) => (
                <tr key={srv.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{srv.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{srv.ip}</td>
                  <td className="px-4 py-3 text-muted-foreground">{srv.port}</td>
                  <td className="px-4 py-3 text-muted-foreground uppercase text-xs">
                    {srv.protocol}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {TYPE_LABEL[srv.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        srv.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {srv.status === "active" ? "Activo" : srv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(srv)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar servidor" : "Nuevo servidor"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Servidor Principal"
              />
            </div>
            <div className="space-y-1.5">
              <Label>IP / Dominio</Label>
              <Input
                value={form.ip}
                onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                placeholder="192.168.1.1 o miservidor.com"
              />
            </div>
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
              <select
                value={form.protocol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, protocol: e.target.value as ServerProtocol }))
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
                <option value="rtmp">RTMP</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as ServerType }))
                }
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="live">Live</option>
                <option value="vod">VOD</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !form.ip || !form.port}
              className="w-full gap-2"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wifi className="size-4" />
              )}
              Probar conexión
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.ip}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Actualizar" : "Guardar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
