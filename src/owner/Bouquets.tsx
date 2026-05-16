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
import { Loader2, MoreHorizontal, Plus, ListMusic, Search, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Bouquet, BouquetItem, Stream, VodItem } from "@/types/owner-panel";

// ── Toggle ───────────────────────────────────────────────────────────────────

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

// ── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  active: true,
};

// ── Component ────────────────────────────────────────────────────────────────

export default function Bouquets() {
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [bouquetItems, setBouquetItems] = useState<BouquetItem[]>([]);
  const [streams, setStreams] = useState<Pick<Stream, "id" | "name" | "logo_url" | "category">[]>([]);
  const [vodItems, setVodItems] = useState<Pick<VodItem, "id" | "title" | "poster_url" | "type">[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Bouquet | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Item assignment state (inside sheet)
  const [assignedStreamIds, setAssignedStreamIds] = useState<Set<string>>(new Set());
  const [assignedVodIds, setAssignedVodIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"canales" | "vod">("canales");
  const [itemSearch, setItemSearch] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Bouquet | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [bRes, itemsRes, strRes, vodRes] = await Promise.all([
      ownerSupabase.from("bouquets").select("*").order("name"),
      ownerSupabase.from("bouquet_items").select("*"),
      ownerSupabase.from("streams").select("id, name, logo_url, category").eq("active", true).order("name"),
      ownerSupabase.from("vod_items").select("id, title, poster_url, type").eq("active", true).order("title"),
    ]);
    setBouquets(bRes.data ?? []);
    setBouquetItems(itemsRes.data ?? []);
    setStreams(strRes.data ?? []);
    setVodItems(vodRes.data ?? []);
    setLoading(false);
  }

  // Stats
  const activeCount = useMemo(() => bouquets.filter((b) => b.active).length, [bouquets]);

  // Item counts per bouquet
  const itemCounts = useMemo(() => {
    const m: Record<string, { streams: number; vod: number }> = {};
    for (const item of bouquetItems) {
      if (!m[item.bouquet_id]) m[item.bouquet_id] = { streams: 0, vod: 0 };
      if (item.stream_id) m[item.bouquet_id].streams++;
      if (item.vod_item_id) m[item.bouquet_id].vod++;
    }
    return m;
  }, [bouquetItems]);

  // ── Sheet open/close ───────────────────────────────────────────────────────

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAssignedStreamIds(new Set());
    setAssignedVodIds(new Set());
    setActiveTab("canales");
    setItemSearch("");
    setSheetOpen(true);
  }

  function openEdit(bouquet: Bouquet) {
    setEditing(bouquet);
    setForm({
      name: bouquet.name,
      description: bouquet.description ?? "",
      active: bouquet.active,
    });
    // Load currently assigned items
    const bItems = bouquetItems.filter((i) => i.bouquet_id === bouquet.id);
    setAssignedStreamIds(new Set(bItems.filter((i) => i.stream_id).map((i) => i.stream_id!)));
    setAssignedVodIds(new Set(bItems.filter((i) => i.vod_item_id).map((i) => i.vod_item_id!)));
    setActiveTab("canales");
    setItemSearch("");
    setSheetOpen(true);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      let bouquetId: string;

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        active: form.active,
      };

      if (editing) {
        const { error } = await ownerSupabase.from("bouquets").update(payload).eq("id", editing.id);
        if (error) throw error;
        bouquetId = editing.id;
      } else {
        const { data, error } = await ownerSupabase.from("bouquets").insert(payload).select("id").single();
        if (error) throw error;
        bouquetId = data.id;
      }

      // Rebuild bouquet_items: delete all existing, then insert new ones
      await ownerSupabase.from("bouquet_items").delete().eq("bouquet_id", bouquetId);

      const newItems: { bouquet_id: string; stream_id: string | null; vod_item_id: string | null }[] = [];
      for (const sid of assignedStreamIds) {
        newItems.push({ bouquet_id: bouquetId, stream_id: sid, vod_item_id: null });
      }
      for (const vid of assignedVodIds) {
        newItems.push({ bouquet_id: bouquetId, stream_id: null, vod_item_id: vid });
      }

      if (newItems.length > 0) {
        const { error: insertErr } = await ownerSupabase.from("bouquet_items").insert(newItems);
        if (insertErr) throw insertErr;
      }

      toast.success(editing ? "Bouquet actualizado" : "Bouquet creado");
      setSheetOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando bouquet");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ──────────────────────────────────────────────────────────

  async function toggleActive(bouquet: Bouquet) {
    await ownerSupabase.from("bouquets").update({ active: !bouquet.active }).eq("id", bouquet.id);
    toast.success(bouquet.active ? "Bouquet desactivado" : "Bouquet activado");
    load();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    // Delete items first, then the bouquet
    await ownerSupabase.from("bouquet_items").delete().eq("bouquet_id", deleteTarget.id);
    const { error } = await ownerSupabase.from("bouquets").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando bouquet");
    } else {
      toast.success(`Bouquet "${deleteTarget.name}" eliminado`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      load();
    }
  }

  // ── Filtered items for assignment ──────────────────────────────────────────

  const filteredStreams = useMemo(() => {
    if (!itemSearch.trim()) return streams;
    const q = itemSearch.toLowerCase();
    return streams.filter((s) => s.name.toLowerCase().includes(q));
  }, [streams, itemSearch]);

  const filteredVod = useMemo(() => {
    if (!itemSearch.trim()) return vodItems;
    const q = itemSearch.toLowerCase();
    return vodItems.filter((v) => v.title.toLowerCase().includes(q));
  }, [vodItems, itemSearch]);

  // Select all helpers
  const allStreamsSelected = filteredStreams.length > 0 && filteredStreams.every((s) => assignedStreamIds.has(s.id));
  const allVodSelected = filteredVod.length > 0 && filteredVod.every((v) => assignedVodIds.has(v.id));

  function toggleAllStreams() {
    if (allStreamsSelected) {
      const next = new Set(assignedStreamIds);
      for (const s of filteredStreams) next.delete(s.id);
      setAssignedStreamIds(next);
    } else {
      const next = new Set(assignedStreamIds);
      for (const s of filteredStreams) next.add(s.id);
      setAssignedStreamIds(next);
    }
  }

  function toggleAllVod() {
    if (allVodSelected) {
      const next = new Set(assignedVodIds);
      for (const v of filteredVod) next.delete(v.id);
      setAssignedVodIds(next);
    } else {
      const next = new Set(assignedVodIds);
      for (const v of filteredVod) next.add(v.id);
      setAssignedVodIds(next);
    }
  }

  function toggleStream(id: string) {
    const next = new Set(assignedStreamIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setAssignedStreamIds(next);
  }

  function toggleVod(id: string) {
    const next = new Set(assignedVodIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setAssignedVodIds(next);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Bouquets</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{bouquets.length}</span> bouquets ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5 shrink-0"
        >
          <Plus className="size-4" /> Nuevo bouquet
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : bouquets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <ListMusic className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay bouquets aún. Crea el primero.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Descripción</th>
                <th className="px-4 py-3 font-medium">Canales</th>
                <th className="px-4 py-3 font-medium">VOD</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bouquets.map((b) => (
                <tr
                  key={b.id}
                  className={cn("hover:bg-muted/20 transition-colors", !b.active && "opacity-50")}
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{b.name}</span>
                  </td>
                  {/* Description */}
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                    {b.description ?? "—"}
                  </td>
                  {/* Stream count */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs font-medium">
                      {itemCounts[b.id]?.streams ?? 0}
                    </span>
                  </td>
                  {/* VOD count */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 text-xs font-medium">
                      {itemCounts[b.id]?.vod ?? 0}
                    </span>
                  </td>
                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <Toggle checked={b.active} onChange={() => toggleActive(b)} />
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
                        <DropdownMenuItem onClick={() => openEdit(b)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(b)}>
                          {b.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            setDeleteTarget(b);
                            setDeleteConfirm(true);
                          }}
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

      {/* ── Create / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar bouquet" : "Nuevo bouquet"}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Latino Premium"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Descripción</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción del bouquet (opcional)"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Toggle checked={form.active} onChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              <Label className="cursor-pointer">Activo</Label>
            </div>

            {/* ── Item Assignment Tabs ── */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Contenido del bouquet</p>
                <p className="text-xs text-muted-foreground">
                  {assignedStreamIds.size} canales · {assignedVodIds.size} VOD
                </p>
              </div>

              {/* Tab buttons */}
              <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => { setActiveTab("canales"); setItemSearch(""); }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "canales"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Canales ({streams.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("vod"); setItemSearch(""); }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeTab === "vod"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  VOD ({vodItems.length})
                </button>
              </div>

              {/* Search within tab */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "canales" ? "Buscar canal..." : "Buscar título..."}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="pl-8 h-8 text-sm pr-7"
                />
                {itemSearch && (
                  <button
                    onClick={() => setItemSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Canales tab */}
              {activeTab === "canales" && (
                <div className="space-y-1">
                  {/* Select all */}
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer border-b border-border mb-1">
                    <input
                      type="checkbox"
                      checked={allStreamsSelected}
                      onChange={toggleAllStreams}
                      className="size-4 rounded border-border text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Seleccionar todos ({filteredStreams.length})
                    </span>
                  </label>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {filteredStreams.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignedStreamIds.has(s.id)}
                          onChange={() => toggleStream(s.id)}
                          className="size-4 rounded border-border text-violet-600 focus:ring-violet-500"
                        />
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt=""
                            className="size-5 rounded object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="size-5 rounded bg-muted" />
                        )}
                        <span className="text-sm text-foreground truncate">{s.name}</span>
                        {s.category && (
                          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{s.category}</span>
                        )}
                      </label>
                    ))}
                    {filteredStreams.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Sin resultados</p>
                    )}
                  </div>
                </div>
              )}

              {/* VOD tab */}
              {activeTab === "vod" && (
                <div className="space-y-1">
                  {/* Select all */}
                  <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer border-b border-border mb-1">
                    <input
                      type="checkbox"
                      checked={allVodSelected}
                      onChange={toggleAllVod}
                      className="size-4 rounded border-border text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      Seleccionar todos ({filteredVod.length})
                    </span>
                  </label>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {filteredVod.map((v) => (
                      <label
                        key={v.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={assignedVodIds.has(v.id)}
                          onChange={() => toggleVod(v.id)}
                          className="size-4 rounded border-border text-violet-600 focus:ring-violet-500"
                        />
                        {v.poster_url ? (
                          <img
                            src={v.poster_url}
                            alt=""
                            className="h-6 w-4 rounded object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="h-6 w-4 rounded bg-muted" />
                        )}
                        <span className="text-sm text-foreground truncate">{v.title}</span>
                        <span className={cn(
                          "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                          v.type === "movie"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-indigo-50 text-indigo-700"
                        )}>
                          {v.type === "movie" ? "Película" : "Serie"}
                        </span>
                      </label>
                    ))}
                    {filteredVod.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Sin resultados</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2 mt-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear bouquet"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar bouquet?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el bouquet <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>.
              Se eliminarán todas las asignaciones de contenido. Esta acción no se puede deshacer.
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
