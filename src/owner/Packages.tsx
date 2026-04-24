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
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Package } from "@/types/owner-panel";

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

export default function Packages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [lineCount, setLineCount] = useState<Record<string, number>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await ownerSupabase
      .from("packages")
      .select("*")
      .order("credits_cost");
    setPackages(data ?? []);

    // Count lines per package
    const { data: lines } = await ownerSupabase
      .from("lines")
      .select("package_id");
    const counts: Record<string, number> = {};
    for (const l of lines ?? []) {
      if (l.package_id) counts[l.package_id] = (counts[l.package_id] ?? 0) + 1;
    }
    setLineCount(counts);
    setLoading(false);
  }

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

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        duration_hours: parseInt(form.duration_hours) || 720,
        credits_cost: parseInt(form.credits_cost) || 0,
        is_demo: form.is_demo,
        active: form.active,
      };

      if (editing) {
        const { error } = await ownerSupabase
          .from("packages")
          .update(payload)
          .eq("id", editing.id);
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

  async function toggleActive(pkg: Package) {
    if (!pkg.active && (lineCount[pkg.id] ?? 0) > 0) {
      // allow toggle either way unless trying to delete
    }
    await ownerSupabase
      .from("packages")
      .update({ active: !pkg.active })
      .eq("id", pkg.id);
    toast.success(pkg.active ? "Paquete desactivado" : "Paquete activado");
    load();
  }

  function formatDuration(hours: number) {
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} días`;
    return `${Math.round(days / 30)} mes${Math.round(days / 30) > 1 ? "es" : ""}`;
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Paquetes</h1>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Plus className="size-4" /> Nuevo paquete
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Duración</th>
                <th className="px-4 py-3 font-medium">Créditos</th>
                <th className="px-4 py-3 font-medium">Demo</th>
                <th className="px-4 py-3 font-medium">Líneas</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{pkg.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDuration(pkg.duration_hours)}
                  </td>
                  <td className="px-4 py-3 font-medium text-violet-600">
                    {pkg.is_demo ? "Gratis" : `${pkg.credits_cost} cr.`}
                  </td>
                  <td className="px-4 py-3">
                    {pkg.is_demo && (
                      <span className="rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-medium">
                        Demo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lineCount[pkg.id] ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(pkg)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        pkg.active ? "bg-violet-600" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          pkg.active ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(pkg)}
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
            <SheetTitle>{editing ? "Editar paquete" : "Nuevo paquete"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: 1 Mes"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Duración (horas)</Label>
              <Input
                type="number"
                min={1}
                value={form.duration_hours}
                onChange={(e) =>
                  setForm((f) => ({ ...f, duration_hours: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                720 = 1 mes · 2160 = 3 meses · 8760 = 1 año
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Costo en créditos</Label>
              <Input
                type="number"
                min={0}
                value={form.credits_cost}
                onChange={(e) =>
                  setForm((f) => ({ ...f, credits_cost: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, is_demo: !f.is_demo }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.is_demo ? "bg-violet-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    form.is_demo ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
              <Label>Es paquete demo</Label>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  form.active ? "bg-violet-600" : "bg-zinc-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    form.active ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
              <Label>Activo</Label>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
