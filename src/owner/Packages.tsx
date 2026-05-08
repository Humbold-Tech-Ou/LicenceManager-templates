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
import { Loader2, MoreHorizontal, Plus, Package as PackageIcon } from "lucide-react";
import { toast } from "sonner";
import type { Package } from "@/types/owner-panel";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(hours: number) {
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} día${days > 1 ? "s" : ""}`;
  const months = Math.round(days / 30);
  return `${months} mes${months > 1 ? "es" : ""}`;
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-violet-600" : "bg-zinc-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const DURATION_PRESETS = [
  { label: "24 h", hours: 24 },
  { label: "1 mes", hours: 720 },
  { label: "3 meses", hours: 2160 },
  { label: "6 meses", hours: 4320 },
  { label: "12 meses", hours: 8760 },
];

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  duration_hours: string;
  credits_cost: string;
  is_demo: boolean;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  duration_hours: "720",
  credits_cost: "1",
  is_demo: false,
  active: true,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineCount, setLineCount] = useState<Record<string, number>>({});

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: pkgs }, { data: lines }] = await Promise.all([
      ownerSupabase.from("packages").select("*").order("credits_cost"),
      ownerSupabase.from("lines").select("package_id"),
    ]);
    setPackages(pkgs ?? []);
    const counts: Record<string, number> = {};
    for (const l of lines ?? []) {
      if (l.package_id) counts[l.package_id] = (counts[l.package_id] ?? 0) + 1;
    }
    setLineCount(counts);
    setLoading(false);
  }

  // Summary
  const activeCount = useMemo(() => packages.filter((p) => p.active).length, [packages]);
  const demoCount = useMemo(() => packages.filter((p) => p.is_demo).length, [packages]);
  const inactiveCount = packages.length - activeCount;

  // ── Sheet open/close ─────────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(pkg: Package) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      duration_hours: String(pkg.duration_hours),
      credits_cost: String(pkg.credits_cost),
      is_demo: pkg.is_demo,
      active: pkg.active,
    });
    setSheetOpen(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        duration_hours: parseInt(form.duration_hours) || 720,
        credits_cost: form.is_demo ? 0 : (parseInt(form.credits_cost) || 0),
        is_demo: form.is_demo,
        active: form.active,
      };
      if (editing) {
        const { error } = await ownerSupabase.from("packages").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Paquete actualizado");
      } else {
        const { error } = await ownerSupabase.from("packages").insert(payload);
        if (error) throw error;
        toast.success("Paquete creado");
      }
      setSheetOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando paquete");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(pkg: Package) {
    await ownerSupabase.from("packages").update({ active: !pkg.active }).eq("id", pkg.id);
    toast.success(pkg.active ? "Paquete desactivado" : "Paquete activado");
    load();
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("packages").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando paquete");
    } else {
      toast.success(`Paquete "${deleteTarget.name}" eliminado`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      load();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Paquetes</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{packages.length}</span> paquetes ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos
              {demoCount > 0 && (
                <> · <span className="text-blue-600 font-medium">{demoCount}</span> demo</>
              )}
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
          <Plus className="size-4" /> Nuevo paquete
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <PackageIcon className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay paquetes aún. Crea el primero.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Duración</th>
                <th className="px-4 py-3 font-medium">Costo</th>
                <th className="px-4 py-3 font-medium">Líneas</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((pkg) => (
                <tr
                  key={pkg.id}
                  className={`hover:bg-muted/20 transition-colors ${!pkg.active ? "opacity-50" : ""}`}
                >
                  {/* Name + demo badge */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{pkg.name}</span>
                      {pkg.is_demo && (
                        <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-medium">
                          Demo
                        </span>
                      )}
                    </div>
                  </td>
                  {/* Duration */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDuration(pkg.duration_hours)}
                    <span className="text-xs text-muted-foreground/60 ml-1">({pkg.duration_hours}h)</span>
                  </td>
                  {/* Credits */}
                  <td className="px-4 py-3">
                    {pkg.is_demo ? (
                      <span className="text-green-600 font-medium text-xs">Gratis</span>
                    ) : (
                      <span className="font-medium text-violet-600">{pkg.credits_cost} cr.</span>
                    )}
                  </td>
                  {/* Lines count */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {lineCount[pkg.id] ?? 0}
                  </td>
                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <Toggle checked={pkg.active} onChange={() => toggleActive(pkg)} />
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
                        <DropdownMenuItem onClick={() => openEdit(pkg)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(pkg)}>
                          {pkg.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          disabled={(lineCount[pkg.id] ?? 0) > 0}
                          onClick={() => {
                            if ((lineCount[pkg.id] ?? 0) > 0) return;
                            setDeleteTarget(pkg);
                            setDeleteConfirm(true);
                          }}
                        >
                          Eliminar
                          {(lineCount[pkg.id] ?? 0) > 0 && (
                            <span className="ml-1 text-[10px] text-muted-foreground">
                              ({lineCount[pkg.id]} líneas)
                            </span>
                          )}
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

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar paquete" : "Nuevo paquete"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: 1 Mes Premium"
              />
            </div>

            {/* Duration presets */}
            <div className="space-y-1.5">
              <Label>Duración</Label>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.hours}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, duration_hours: String(p.hours) }))}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      form.duration_hours === String(p.hours)
                        ? "border-violet-600 bg-violet-50 text-violet-700"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                value={form.duration_hours}
                onChange={(e) => setForm((f) => ({ ...f, duration_hours: e.target.value }))}
                placeholder="Horas personalizadas"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground">
                {formatDuration(parseInt(form.duration_hours) || 0)} de duración
              </p>
            </div>

            {/* Credits cost (hidden when demo) */}
            {!form.is_demo && (
              <div className="space-y-1.5">
                <Label>Costo en créditos</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.credits_cost}
                  onChange={(e) => setForm((f) => ({ ...f, credits_cost: e.target.value }))}
                />
              </div>
            )}

            {/* Is demo toggle */}
            <div className="flex items-center gap-3">
              <Toggle
                checked={form.is_demo}
                onChange={(v) =>
                  setForm((f) => ({ ...f, is_demo: v, credits_cost: v ? "0" : f.credits_cost }))
                }
              />
              <div>
                <Label className="cursor-pointer">Es paquete demo</Label>
                <p className="text-xs text-muted-foreground">Sin costo, acceso limitado</p>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label className="cursor-pointer">Activo (visible para resellers)</Label>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2 mt-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear paquete"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el paquete <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>.
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
