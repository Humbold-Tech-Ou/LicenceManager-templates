import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Plus, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Line, Package, Reseller, Server, LineStatus } from "@/types/owner-panel";

function StatusBadge({ status }: { status: LineStatus }) {
  const map: Record<LineStatus, string> = {
    active: "bg-green-100 text-green-700",
    expired: "bg-orange-100 text-orange-700",
    suspended: "bg-red-100 text-red-700",
  };
  const label: Record<LineStatus, string> = { active: "Activa", expired: "Expirada", suspended: "Suspendida" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {label[status]}
    </span>
  );
}

function randomStr(len: number) {
  return Math.random().toString(36).slice(2, 2 + len);
}

export default function Lines() {
  const { reseller: me } = useOwnerAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [credModal, setCredModal] = useState<Line | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    username: "",
    password: "",
    package_id: "",
    reseller_id: "",
    notes: "",
    autoUser: true,
    autoPass: true,
  });

  useEffect(() => {
    loadAll();
  }, [me?.id]);

  async function loadAll() {
    setLoading(true);
    const [linesRes, pkgRes, resRes, srvRes] = await Promise.all([
      ownerSupabase
        .from("lines")
        .select("*, package:packages(id,name,duration_hours), reseller:resellers(id,name)")
        .order("created_at", { ascending: false }),
      ownerSupabase.from("packages").select("*").eq("active", true),
      ownerSupabase.from("resellers").select("id, name").order("name"),
      ownerSupabase.from("servers").select("*").eq("status", "active"),
    ]);
    setLines((linesRes.data ?? []) as Line[]);
    setPackages(pkgRes.data ?? []);
    setResellers((resRes.data ?? []) as Reseller[]);
    setServers(srvRes.data ?? []);
    setLoading(false);
  }

  function openNew() {
    setForm({
      username: randomStr(8),
      password: randomStr(10),
      package_id: packages[0]?.id ?? "",
      reseller_id: me?.id ?? "",
      notes: "",
      autoUser: true,
      autoPass: true,
    });
    setSheetOpen(true);
  }

  async function handleCreate() {
    if (!me) return;
    const pkg = packages.find((p) => p.id === form.package_id);
    if (!pkg) { toast.error("Selecciona un paquete"); return; }

    // Credit check
    if (!pkg.is_demo) {
      const available = me.credits_total - me.credits_used;
      if (available < pkg.credits_cost) {
        toast.error(`Créditos insuficientes (necesitas ${pkg.credits_cost}, tienes ${available})`);
        return;
      }
    }

    // Demo monthly limit check
    if (pkg.is_demo) {
      const resRef = resellers.find((r) => r.id === form.reseller_id) ?? me;
      if ((resRef.demos_this_month ?? 0) >= (resRef.demos_limit ?? 50)) {
        toast.error("Límite de demos mensuales alcanzado");
        return;
      }
    }

    setSaving(true);
    try {
      const expiresAt = new Date(
        Date.now() + pkg.duration_hours * 3600 * 1000
      ).toISOString();

      const { error } = await ownerSupabase.from("lines").insert({
        reseller_id: form.reseller_id || null,
        package_id: form.package_id,
        username: form.username,
        password: form.password,
        is_demo: pkg.is_demo,
        status: "active",
        expires_at: expiresAt,
        max_connections: 1,
        notes: form.notes || null,
      });

      if (error) throw error;

      // Deduct credits
      if (!pkg.is_demo && pkg.credits_cost > 0) {
        await ownerSupabase
          .from("resellers")
          .update({ credits_used: me.credits_used + pkg.credits_cost })
          .eq("id", me.id);
      }

      // Increment demo counter
      if (pkg.is_demo && form.reseller_id) {
        const resRef = resellers.find((r) => r.id === form.reseller_id);
        if (resRef) {
          await ownerSupabase
            .from("resellers")
            .update({ demos_this_month: (resRef.demos_this_month ?? 0) + 1 })
            .eq("id", form.reseller_id);
        }
      }

      toast.success("Línea creada");
      setSheetOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creando línea");
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(line: Line) {
    const newStatus = line.status === "suspended" ? "active" : "suspended";
    await ownerSupabase.from("lines").update({ status: newStatus }).eq("id", line.id);
    toast.success(newStatus === "active" ? "Línea reactivada" : "Línea suspendida");
    loadAll();
  }

  async function handleDelete(line: Line) {
    await ownerSupabase.from("lines").delete().eq("id", line.id);
    toast.success("Línea eliminada");
    loadAll();
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Copiado");
  }

  function getM3U(line: Line) {
    const srv = servers[0];
    if (!srv) return "";
    return `http://${srv.ip}:${srv.port}/get.php?username=${line.username}&password=${line.password}&type=m3u_plus`;
  }

  const filtered = lines.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (search && !l.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Líneas IPTV</h1>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Plus className="size-4" /> Nueva línea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="expired">Expiradas</option>
          <option value="suspended">Suspendidas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No se encontraron líneas.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Password</th>
                  <th className="px-4 py-3 font-medium">Paquete</th>
                  <th className="px-4 py-3 font-medium">Reseller</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Expira</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((line) => (
                  <tr key={line.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{line.username}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">
                          {showPass[line.id] ? line.password : "••••••••"}
                        </span>
                        <button
                          onClick={() =>
                            setShowPass((p) => ({ ...p, [line.id]: !p[line.id] }))
                          }
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPass[line.id] ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.package?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.reseller?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={line.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(line.expires_at), "d MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setCredModal(line)}>
                            Ver credenciales
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyText(getM3U(line), `m3u-${line.id}`)}>
                            Copiar M3U
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSuspend(line)}>
                            {line.status === "suspended" ? "Reactivar" : "Suspender"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(line)}
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
        </div>
      )}

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Nueva línea IPTV</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Username</Label>
                <button
                  className="text-xs text-violet-600 hover:underline"
                  onClick={() => setForm((f) => ({ ...f, username: randomStr(8) }))}
                >
                  Generar
                </button>
              </div>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Password</Label>
                <button
                  className="text-xs text-violet-600 hover:underline"
                  onClick={() => setForm((f) => ({ ...f, password: randomStr(10) }))}
                >
                  Generar
                </button>
              </div>
              <Input
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paquete</Label>
              <select
                value={form.package_id}
                onChange={(e) => setForm((f) => ({ ...f, package_id: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.is_demo ? "(Demo)" : `— ${p.credits_cost} cr.`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reseller</Label>
              <select
                value={form.reseller_id}
                onChange={(e) => setForm((f) => ({ ...f, reseller_id: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— Ninguno —</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Cliente, dispositivo, etc."
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={saving || !form.username || !form.password || !form.package_id}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear línea
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Credentials Modal */}
      <Dialog open={!!credModal} onOpenChange={() => setCredModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credenciales — {credModal?.username}</DialogTitle>
          </DialogHeader>
          {credModal && servers[0] && (
            <div className="space-y-3 text-sm">
              {[
                {
                  label: "M3U Plus",
                  value: `http://${servers[0].ip}:${servers[0].port}/get.php?username=${credModal.username}&password=${credModal.password}&type=m3u_plus`,
                },
                {
                  label: "EPG",
                  value: `http://${servers[0].ip}:${servers[0].port}/xmltv.php?username=${credModal.username}&password=${credModal.password}`,
                },
                {
                  label: "Xtream API",
                  value: `http://${servers[0].ip}:${servers[0].port}/player_api.php?username=${credModal.username}&password=${credModal.password}`,
                },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <code className="flex-1 text-xs break-all">{value}</code>
                    <button
                      onClick={() => copyText(value, label)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      {copied === label ? (
                        <Check className="size-3.5 text-green-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {credModal && !servers[0] && (
            <p className="text-sm text-muted-foreground">
              No hay servidores configurados. Ve a Servidores para agregar uno.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
