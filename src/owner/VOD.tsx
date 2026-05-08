import { useEffect, useState, useMemo } from "react";
import { ownerSupabase, useOwnerConfig } from "@/hooks/useOwnerPanel";
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
  Loader2, Plus, Search, Film, Tv, MoreHorizontal, Star, X,
} from "lucide-react";
import { toast } from "sonner";
import type { VodItem, VodType, Server } from "@/types/owner-panel";

// ── TMDB types ────────────────────────────────────────────────────────────────

interface TmdbResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface FormState {
  title: string;
  type: VodType;
  overview: string;
  poster_url: string;
  stream_url: string;
  server_id: string;
  rating: string;
}

const EMPTY_FORM: FormState = {
  title: "", type: "movie", overview: "",
  poster_url: "", stream_url: "", server_id: "", rating: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function VOD() {
  const config = useOwnerConfig();
  const [items, setItems]     = useState<VodItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]         = useState("");
  const [filterType, setFilterType] = useState<"all" | VodType>("all");

  // Sheet (create / edit)
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingItem, setEditingItem]   = useState<VodItem | null>(null);
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);

  // TMDB search
  const [tmdbQuery, setTmdbQuery]       = useState("");
  const [tmdbResults, setTmdbResults]   = useState<TmdbResult[]>([]);
  const [tmdbLoading, setTmdbLoading]   = useState(false);
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbResult | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<VodItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [vodRes, srvRes] = await Promise.all([
      ownerSupabase.from("vod_items").select("*").order("created_at", { ascending: false }),
      ownerSupabase.from("servers").select("*").eq("status", "active"),
    ]);
    setItems(vodRes.data ?? []);
    setServers(srvRes.data ?? []);
    setLoading(false);
  }

  // Summary counts
  const movieCount  = useMemo(() => items.filter((i) => i.type === "movie").length, [items]);
  const seriesCount = useMemo(() => items.filter((i) => i.type === "series").length, [items]);
  const activeCount = useMemo(() => items.filter((i) => i.active).length, [items]);

  // Filtered list
  const filtered = useMemo(() =>
    items.filter((i) => {
      if (filterType !== "all" && i.type !== filterType) return false;
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [items, filterType, search]);

  const hasFilters = search !== "" || filterType !== "all";

  // Server name lookup
  const serverName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of servers) m[s.id] = s.name;
    return m;
  }, [servers]);

  // ── TMDB ─────────────────────────────────────────────────────────────────────

  async function searchTmdb() {
    const apiKey = config.branding?.tmdb_api_key;
    if (!apiKey) {
      toast.error("Configura tu TMDB API Key en Configuración primero");
      return;
    }
    if (!tmdbQuery.trim()) return;
    setTmdbLoading(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(tmdbQuery)}&api_key=${apiKey}&language=es-ES`
      );
      const data = await res.json();
      setTmdbResults(
        (data.results ?? []).filter(
          (r: TmdbResult) => r.media_type === "movie" || r.media_type === "tv"
        )
      );
    } catch {
      toast.error("Error buscando en TMDB");
    } finally {
      setTmdbLoading(false);
    }
  }

  function selectTmdb(r: TmdbResult) {
    setSelectedTmdb(r);
    setForm((f) => ({
      ...f,
      title:     r.title ?? r.name ?? "",
      type:      r.media_type === "tv" ? "series" : "movie",
      overview:  r.overview ?? "",
      poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : "",
      rating:    String(r.vote_average?.toFixed(1) ?? ""),
    }));
    setTmdbResults([]);
  }

  // ── Open sheet ────────────────────────────────────────────────────────────────

  function openNew() {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM, server_id: servers[0]?.id ?? "" });
    setSelectedTmdb(null);
    setTmdbQuery("");
    setTmdbResults([]);
    setSheetOpen(true);
  }

  function openEdit(item: VodItem) {
    setEditingItem(item);
    setForm({
      title:      item.title,
      type:       item.type,
      overview:   item.overview ?? "",
      poster_url: item.poster_url ?? "",
      stream_url: item.stream_url ?? "",
      server_id:  item.server_id ?? "",
      rating:     item.rating != null ? String(item.rating) : "",
    });
    setSelectedTmdb(null);
    setTmdbQuery("");
    setTmdbResults([]);
    setSheetOpen(true);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title) { toast.error("El título es requerido"); return; }
    setSaving(true);
    try {
      const payload: Partial<VodItem> = {
        title:      form.title,
        type:       form.type,
        overview:   form.overview || null,
        poster_url: form.poster_url || null,
        stream_url: form.stream_url || null,
        server_id:  form.server_id || null,
        rating:     form.rating ? parseFloat(form.rating) : null,
        tmdb_id:    selectedTmdb?.id ?? (editingItem?.tmdb_id ?? null),
        genres:     [],
        cast_list:  [],
        active:     editingItem?.active ?? true,
      };
      if (editingItem) {
        const { error } = await ownerSupabase.from("vod_items").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Contenido actualizado");
      } else {
        const { error } = await ownerSupabase.from("vod_items").insert({ ...payload, active: true });
        if (error) throw error;
        toast.success("Contenido agregado");
      }
      setSheetOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando contenido");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  async function toggleActive(item: VodItem) {
    await ownerSupabase.from("vod_items").update({ active: !item.active }).eq("id", item.id);
    toast.success(item.active ? "Desactivado" : "Activado");
    loadAll();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("vod_items").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando contenido");
    } else {
      toast.success(`"${deleteTarget.title}" eliminado`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      loadAll();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">VOD</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{items.length}</span> contenidos ·{" "}
              <span className="text-blue-600 font-medium">{movieCount}</span> películas ·{" "}
              <span className="text-violet-600 font-medium">{seriesCount}</span> series ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5 shrink-0"
        >
          <Plus className="size-4" /> Agregar contenido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 w-48 text-sm pr-7"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el contenido</SelectItem>
            <SelectItem value="movie">Películas</SelectItem>
            <SelectItem value="series">Series</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setFilterType("all"); }}>
            <X className="size-3 mr-1" /> Limpiar
          </Button>
        )}
        {hasFilters && (
          <span className="text-xs text-muted-foreground ml-1">
            {filtered.length} de {items.length}
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Film className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay contenido VOD aún."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group rounded-xl border border-border bg-card overflow-hidden transition-opacity ${!item.active ? "opacity-40" : ""}`}
            >
              {/* Poster */}
              <div className="relative w-full aspect-[2/3] bg-muted">
                {item.poster_url ? (
                  <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.type === "series"
                      ? <Tv className="size-8 text-muted-foreground/40" />
                      : <Film className="size-8 text-muted-foreground/40" />}
                  </div>
                )}
                {/* Type badge — top left */}
                <span className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  item.type === "series"
                    ? "bg-violet-600/90 text-white"
                    : "bg-blue-600/90 text-white"
                }`}>
                  {item.type === "series" ? "Serie" : "Película"}
                </span>
                {/* Rating — top right */}
                {item.rating != null && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">
                    <Star className="size-2.5 fill-yellow-400" />
                    {item.rating.toFixed(1)}
                  </span>
                )}
                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1.5">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="size-7 bg-white/90 hover:bg-white text-foreground">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActive(item)}>
                        {item.active ? "Desactivar" : "Activar"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => { setDeleteTarget(item); setDeleteConfirm(true); }}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5 space-y-1">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">{item.title}</p>
                {item.server_id && serverName[item.server_id] && (
                  <p className="text-[10px] text-muted-foreground/70 truncate">{serverName[item.server_id]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sheet (create / edit) ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem ? "Editar contenido" : "Agregar contenido VOD"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">

            {/* TMDB Search (only on create) */}
            {!editingItem && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Buscar en TMDB (opcional)</p>
                <div className="flex gap-2">
                  <Input
                    value={tmdbQuery}
                    onChange={(e) => setTmdbQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchTmdb()}
                    placeholder="Buscar película o serie..."
                    className="flex-1 h-8 text-sm"
                  />
                  <Button variant="outline" size="icon" className="size-8" onClick={searchTmdb} disabled={tmdbLoading}>
                    {tmdbLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                  </Button>
                </div>
                {tmdbResults.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {tmdbResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectTmdb(r)}
                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted text-sm"
                      >
                        {r.poster_path && (
                          <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`} className="h-10 w-7 rounded object-cover shrink-0" alt="" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{r.title ?? r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.media_type === "tv" ? "Serie" : "Película"} · {(r.release_date ?? r.first_air_date ?? "").slice(0, 4)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedTmdb && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-2 py-1.5 text-xs text-green-700">
                    <span className="font-medium truncate">{selectedTmdb.title ?? selectedTmdb.name}</span>
                    <button onClick={() => { setSelectedTmdb(null); setForm((f) => ({ ...f, poster_url: "", rating: "" })); }} className="ml-auto shrink-0">
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Poster preview */}
            {form.poster_url && (
              <img src={form.poster_url} alt="Poster" className="h-28 rounded-lg object-cover" />
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as VodType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Película</SelectItem>
                  <SelectItem value="series">Serie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Poster URL */}
            <div className="space-y-1.5">
              <Label>URL de Poster</Label>
              <Input
                value={form.poster_url}
                onChange={(e) => setForm((f) => ({ ...f, poster_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            {/* Stream URL */}
            <div className="space-y-1.5">
              <Label>URL de Stream</Label>
              <Input
                value={form.stream_url}
                onChange={(e) => setForm((f) => ({ ...f, stream_url: e.target.value }))}
                placeholder="http://..."
              />
            </div>

            {/* Server */}
            <div className="space-y-1.5">
              <Label>Servidor</Label>
              <Select value={form.server_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, server_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Ninguno —</SelectItem>
                  {servers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div className="space-y-1.5">
              <Label>Rating (0-10)</Label>
              <Input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={form.rating}
                onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                placeholder="Ej: 8.5"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !form.title}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2 mt-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editingItem ? "Guardar cambios" : "Agregar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contenido?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteTarget?.title}"</span>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
