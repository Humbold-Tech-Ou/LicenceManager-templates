import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, MoreHorizontal, Plus, Eye, EyeOff, Copy, Check,
  RefreshCw, Pencil, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { es } from "date-fns/locale";
import type { Line, Package, Reseller, Server, LineStatus } from "@/types/owner-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────
function randomStr(len: number) {
  return Math.random().toString(36).slice(2, 2 + len);
}

function expiryClass(line: Line): string {
  if (line.status === "expired") return "text-red-600 font-medium";
  if (line.status !== "active") return "text-muted-foreground";
  const days = differenceInDays(new Date(line.expires_at), new Date());
  if (days <= 3) return "text-red-600 font-medium";
  if (days <= 7) return "text-orange-500 font-medium";
  return "text-muted-foreground";
}

function rowClass(line: Line): string {
  if (line.status === "expired") return "bg-red-50/40 hover:bg-red-50/60";
  if (line.status === "suspended") return "bg-zinc-50 hover:bg-zinc-100/50";
  const days = differenceInDays(new Date(line.expires_at), new Date());
  if (days <= 7) return "bg-orange-50/40 hover:bg-orange-50/60";
  return "hover:bg-muted/20";
}

function StatusBadge({ status }: { status: LineStatus }) {
  const cls: Record<LineStatus, string> = {
    active:    "bg-green-100 text-green-700",
    expired:   "bg-red-100 text-red-700",
    suspended: "bg-zinc-100 text-zinc-600",
  };
  const lbl: Record<LineStatus, string> = {
    active: "Activa", expired: "Expirada", suspended: "Suspendida",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cls[status]}`}>
      {lbl[status]}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Lines() {
  const { reseller: me } = useOwnerAuth();
  const [lines, setLines] = useState<Line[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReseller, setFilterReseller] = useState("all");

  // Create / edit sheet
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Line | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", package_id: "", reseller_id: "", notes: "",
  });

  // Renew dialog
  const [renewTarget, setRenewTarget] = useState<Line | null>(null);
  const [renewPkgId, setRenewPkgId] = useState("");
  const [renewing, setRenewing] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Line | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Credentials modal
  const [credModal, setCredModal] = useState<Line | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, [me?.id]);

  async function loadAll() {
    setLoading(true);
    const [linesRes, pkgRes, resRes, srvRes] = await Promise.all([
      ownerSupabase
        .from("lines")
        .select("*, package:packages(id,name,duration_hours), reseller:resellers(id,name)")
        .order("expires_at", { ascending: true }),
      ownerSupabase.from("packages").select("*").order("credits_cost"),
      ownerSupabase.from("resellers").select("id, name, demos_this_month, demos_limit").order("name"),
      ownerSupabase.from("servers").select("*").eq("status", "active"),
    ]);
    setLines((linesRes.data ?? []) as Line[]);
    setPackages(pkgRes.data ?? []);
    setResellers((resRes.data ?? []) as Reseller[]);
    setServers(srvRes.data ?? []);
    setLoading(false);
  }

  // ── Create ──────────────────────────────────────────────────────────────────
  function openCreate() {
    setSheetMode("create");
    setEditTarget(null);
    setForm({
      username: randomStr(8),
      password: randomStr(10),
      package_id: packages.find((p) => !p.is_demo)?.id ?? packages[0]?.id ?? "",
      reseller_id: me?.id ?? "",
      notes: "",
    });
    setSheetOpen(true);
  }

  async function handleCreate() {
    if (!me) return;
    const pkg = packages.find((p) => p.id === form.package_id);
    if (!pkg) { toast.error("Selecciona un paquete"); return; }

    if (!pkg.is_demo) {
      const available = me.credits_total - me.credits_used;
      if (available < pkg.credits_cost) {
        toast.error(`Créditos insuficientes (necesitas ${pkg.credits_cost}, tienes ${available})`);
        return;
      }
    }
    if (pkg.is_demo) {
      const resRef = resellers.find((r) => r.id === form.reseller_id) ?? (me as any);
      if ((resRef?.demos_this_month ?? 0) >= (resRef?.demos_limit ?? 50)) {
        toast.error("Límite de demos mensuales alcanzado"); return;
      }
    }

    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + pkg.duration_hours * 3600_000).toISOString();
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

      if (!pkg.is_demo && pkg.credits_cost > 0) {
        await ownerSupabase
          .from("resellers")
          .update({ credits_used: me.credits_used + pkg.credits_cost })
          .eq("id", me.id);
      }
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

  // ── Edit ────────────────────────────────────────────────────────────────────
  function openEdit(line: Line) {
    setSheetMode("edit");
    setEditTarget(line);
    setForm({
      username: line.username,
      password: line.password,
      package_id: line.package_id ?? "",
      reseller_id: line.reseller_id ?? "",
      notes: line.notes ?? "",
    });
    setSheetOpen(true);
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { error } = await ownerSupabase.from("lines").update({
        reseller_id: form.reseller_id || null,
        notes: form.notes || null,
      }).eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Línea actualizada");
      setSheetOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error actualizando línea");
    } finally {
      setSaving(false);
    }
  }

  // ── Renew ───────────────────────────────────────────────────────────────────
  function openRenew(line: Line) {
    setRenewTarget(line);
    setRenewPkgId(line.package_id ?? packages[0]?.id ?? "");
  }

  async function handleRenew() {
    if (!renewTarget || !me) return;
    const pkg = packages.find((p) => p.id === renewPkgId);
    if (!pkg) { toast.error("Selecciona un paquete"); return; }

    if (!pkg.is_demo) {
      const available = me.credits_total - me.credits_used;
      if (available < pkg.credits_cost) {
        toast.error(`Créditos insuficientes (necesitas ${pkg.credits_cost}, tienes ${available})`);
        return;
      }
    }

    setRenewing(true);
    try {
      // Extend from now if expired, from current expiry if still active
      const base = isPast(new Date(renewTarget.expires_at))
        ? Date.now()
        : new Date(renewTarget.expires_at).getTime();
      const newExpiry = new Date(base + pkg.duration_hours * 3600_000).toISOString();

      const { error } = await ownerSupabase.from("lines").update({
        expires_at: newExpiry,
        status: "active",
        package_id: pkg.id,
        is_demo: pkg.is_demo,
      }).eq("id", renewTarget.id);
      if (error) throw error;

      if (!pkg.is_demo && pkg.credits_cost > 0) {
        await ownerSupabase
          .from("resellers")
          .update({ credits_used: me.credits_used + pkg.credits_cost })
          .eq("id", me.id);
      }

      toast.success(`Línea renovada hasta ${format(new Date(newExpiry), "d MMM yyyy", { locale: es })}`);
      setRenewTarget(null);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error renovando línea");
    } finally {
      setRenewing(false);
    }
  }

  // ── Suspend / Delete ────────────────────────────────────────────────────────
  async function handleSuspend(line: Line) {
    const newStatus = line.status === "suspended" ? "active" : "suspended";
    await ownerSupabase.from("lines").update({ status: newStatus }).eq("id", line.id);
    toast.success(newStatus === "active" ? "Línea reactivada" : "Línea suspendida");
    loadAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await ownerSupabase.from("lines").delete().eq("id", deleteTarget.id);
      toast.success("Línea eliminada");
      setDeleteTarget(null);
      loadAll();
    } finally {
      setDeleting(false);
    }
  }

  // ── Clipboard / M3U ────────────────────────────────────────────────────────
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

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = lines.filter((l) => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterReseller !== "all" && l.reseller_id !== filterReseller) return false;
    if (search && !l.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    active:    lines.filter((l) => l.status === "active").length,
    expired:   lines.filter((l) => l.status === "expired").length,
    suspended: lines.filter((l) => l.status === "suspended").length,
  };

  const selectedPkg = packages.find((p) => p.id === renewPkgId);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 max-w-6xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Mis Líneas</h1>
          {!loading && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {lines.length} total ·{" "}
              <span className="text-green-600">{counts.active} activas</span> ·{" "}
              <span className="text-red-600">{counts.expired} expiradas</span> ·{" "}
              <span className="text-zinc-500">{counts.suspended} suspendidas</span>
            </p>
          )}
        </div>
        <Button size="sm" onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 gap-1.5">
          <Plus className="size-4" /> Nueva línea
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-48"
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
        <select
          value={filterReseller}
          onChange={(e) => setFilterReseller(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos los resellers</option>
          {resellers.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {(search || filterStatus !== "all" || filterReseller !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterStatus("all"); setFilterReseller("all"); }}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground border border-input rounded-lg"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
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
                  <tr key={line.id} className={rowClass(line)}>
                    <td className="px-4 py-3 font-mono text-xs">{line.username}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs">
                          {showPass[line.id] ? line.password : "••••••••"}
                        </span>
                        <button
                          onClick={() => setShowPass((p) => ({ ...p, [line.id]: !p[line.id] }))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {showPass[line.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{line.package?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{(line as any).reseller?.name ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={line.status} /></td>
                    <td className={`px-4 py-3 text-xs ${expiryClass(line)}`}>
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openRenew(line)}>
                            <RefreshCw className="size-3.5 mr-2" /> Renovar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(line)}>
                            <Pencil className="size-3.5 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSuspend(line)}>
                            {line.status === "suspended" ? "Reactivar" : "Suspender"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(line)}
                          >
                            <Trash2 className="size-3.5 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length < lines.length && (
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              Mostrando {filtered.length} de {lines.length} líneas
            </div>
          )}
        </div>
      )}

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheetMode === "create" ? "Nueva línea IPTV" : `Editar — ${editTarget?.username}`}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {sheetMode === "create" && (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Username</Label>
                    <button className="text-xs text-violet-600 hover:underline"
                      onClick={() => setForm((f) => ({ ...f, username: randomStr(8) }))}>
                      Generar
                    </button>
                  </div>
                  <Input value={form.username} className="font-mono"
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <button className="text-xs text-violet-600 hover:underline"
                      onClick={() => setForm((f) => ({ ...f, password: randomStr(10) }))}>
                      Generar
                    </button>
                  </div>
                  <Input value={form.password} className="font-mono"
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Paquete</Label>
                  <select value={form.package_id}
                    onChange={(e) => setForm((f) => ({ ...f, package_id: e.target.value }))}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.is_demo ? "(Demo)" : `— ${p.credits_cost} cr.`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Reseller</Label>
              <select value={form.reseller_id}
                onChange={(e) => setForm((f) => ({ ...f, reseller_id: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="">— Ninguno —</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Notas (opcional)</Label>
              <Input value={form.notes} placeholder="Cliente, dispositivo, etc."
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <Button onClick={sheetMode === "create" ? handleCreate : handleEdit}
              disabled={saving || (sheetMode === "create" && (!form.username || !form.password || !form.package_id))}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {sheetMode === "create" ? "Crear línea" : "Guardar cambios"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Renew Dialog ── */}
      <Dialog open={!!renewTarget} onOpenChange={(o) => !o && setRenewTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renovar — {renewTarget?.username}</DialogTitle>
          </DialogHeader>
          {renewTarget && (
            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label>Paquete</Label>
                <select value={renewPkgId} onChange={(e) => setRenewPkgId(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_demo ? "(Demo)" : `— ${p.credits_cost} cr.`}
                    </option>
                  ))}
                </select>
              </div>
              {selectedPkg && (
                <div className="rounded-lg bg-muted px-3 py-2 text-xs space-y-1">
                  <p className="text-muted-foreground">
                    Duración: <span className="font-medium text-foreground">{selectedPkg.name}</span>
                  </p>
                  {!selectedPkg.is_demo && (
                    <p className="text-muted-foreground">
                      Costo: <span className="font-medium text-violet-600">{selectedPkg.credits_cost} créditos</span>
                      {" "}(disponibles: {(me?.credits_total ?? 0) - (me?.credits_used ?? 0)})
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    {isPast(new Date(renewTarget.expires_at))
                      ? "La línea expiró — la renovación parte desde hoy."
                      : "La renovación se suma a la expiración actual."}
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setRenewTarget(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleRenew} disabled={renewing || !renewPkgId}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2">
                  {renewing && <Loader2 className="size-4 animate-spin" />}
                  <RefreshCw className="size-4" /> Renovar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar línea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente la línea{" "}
              <span className="font-mono font-semibold">{deleteTarget?.username}</span>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Credentials Modal ── */}
      <Dialog open={!!credModal} onOpenChange={() => setCredModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Credenciales — {credModal?.username}</DialogTitle>
          </DialogHeader>
          {credModal && servers[0] ? (
            <div className="space-y-3 text-sm">
              {[
                { label: "M3U Plus",   value: `http://${servers[0].ip}:${servers[0].port}/get.php?username=${credModal.username}&password=${credModal.password}&type=m3u_plus` },
                { label: "EPG",        value: `http://${servers[0].ip}:${servers[0].port}/xmltv.php?username=${credModal.username}&password=${credModal.password}` },
                { label: "Xtream API", value: `http://${servers[0].ip}:${servers[0].port}/player_api.php?username=${credModal.username}&password=${credModal.password}` },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                    <code className="flex-1 text-xs break-all">{value}</code>
                    <button onClick={() => copyText(value, label)}
                      className="shrink-0 text-muted-foreground hover:text-foreground">
                      {copied === label
                        ? <Check className="size-3.5 text-green-600" />
                        : <Copy className="size-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay servidores configurados. Ve a Servidores para agregar uno.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
