import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ownerSupabase, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Plus, Search, Film, Tv, MoreHorizontal, Star, X,
  Upload, FolderOpen, ChevronRight, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import type { VodItem, VodType, Server } from "@/types/owner-panel";

// ── TMDB ──────────────────────────────────────────────────────────────────────

interface TmdbResult {
  id: number;
  media_type: "movie" | "tv";
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

// ── Step-dialog form state ────────────────────────────────────────────────────

interface AddForm {
  title: string;
  type: VodType;
  server_id: string;
  file_path: string;
  stream_url: string;
  poster_url: string;
  rating: string;
  year: string;
  overview: string;
}

const EMPTY_ADD: AddForm = {
  title: "", type: "movie", server_id: "", file_path: "",
  stream_url: "", poster_url: "", rating: "", year: "", overview: "",
};

// ── Bulk-import form state ────────────────────────────────────────────────────

interface BulkForm {
  server_id: string;
  base_path: string;
  file_list: string;
  type: VodType;
}

const EMPTY_BULK: BulkForm = { server_id: "", base_path: "", file_list: "", type: "movie" };

// ── Helper: skeleton cards ────────────────────────────────────────────────────

function GridSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden bg-card">
          <Skeleton className="w-full aspect-[2/3]" />
          <div className="p-2.5 space-y-1.5">
            <Skeleton className="h-3 w-4/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VOD() {
  const config   = useOwnerConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/owner-preview");
  const baseRoute = isPreview ? "/owner-preview" : "/owner";

  // ── Data
  const [items,   setItems]   = useState<VodItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Filters
  const [tabType,       setTabType]       = useState<"all" | VodType>("all");
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState<"all" | "active" | "inactive">("all");

  // ── Add-item dialog (step 1 = TMDB search, step 2 = details)
  const [addOpen,        setAddOpen]        = useState(false);
  const [addStep,        setAddStep]        = useState<1 | 2>(1);
  const [tmdbQuery,      setTmdbQuery]      = useState("");
  const [tmdbResults,    setTmdbResults]    = useState<TmdbResult[]>([]);
  const [tmdbLoading,    setTmdbLoading]    = useState(false);
  const [selectedTmdb,   setSelectedTmdb]   = useState<TmdbResult | null>(null);
  const [addForm,        setAddForm]        = useState<AddForm>(EMPTY_ADD);
  const [addSaving,      setAddSaving]      = useState(false);

  // ── Edit dialog (reuses step 2 form)
  const [editItem,       setEditItem]       = useState<VodItem | null>(null);
  const [editOpen,       setEditOpen]       = useState(false);
  const [editForm,       setEditForm]       = useState<AddForm>(EMPTY_ADD);
  const [editSaving,     setEditSaving]     = useState(false);

  // ── Bulk import dialog
  const [bulkOpen,       setBulkOpen]       = useState(false);
  const [bulkForm,       setBulkForm]       = useState<BulkForm>(EMPTY_BULK);
  const [bulkImporting,  setBulkImporting]  = useState(false);
  const [bulkTab,        setBulkTab]        = useState<"text" | "csv">("text");
  const csvRef = useRef<HTMLInputElement>(null);

  // ── Delete
  const [deleteTarget,  setDeleteTarget]  = useState<VodItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ── Load
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [vodRes, srvRes] = await Promise.all([
      ownerSupabase.from("vod_items").select("*").order("created_at", { ascending: false }),
      ownerSupabase.from("servers").select("id, name, status").eq("status", "active"),
    ]);
    setItems(vodRes.data ?? []);
    setServers(srvRes.data ?? []);
    setLoading(false);
  }

  // ── Stats
  const movieCount  = useMemo(() => items.filter(i => i.type === "movie").length,  [items]);
  const seriesCount = useMemo(() => items.filter(i => i.type === "series").length, [items]);
  const activeCount = useMemo(() => items.filter(i => i.active).length,            [items]);

  // ── Filtered list
  const filtered = useMemo(() => items.filter(i => {
    if (tabType !== "all"         && i.type   !== tabType)    return false;
    if (filterStatus === "active"   && !i.active)             return false;
    if (filterStatus === "inactive" &&  i.active)             return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [items, tabType, filterStatus, search]);

  const hasFilters = search !== "" || filterStatus !== "all";

  // ── Server name map
  const serverName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of servers) m[s.id] = s.name;
    return m;
  }, [servers]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  TMDB search (Step 1)
  // ─────────────────────────────────────────────────────────────────────────────

  async function searchTmdb() {
    const apiKey = config.branding?.tmdb_api_key;
    if (!apiKey) { toast.error("Configura tu TMDB API Key en Configuración"); return; }
    if (!tmdbQuery.trim()) return;
    setTmdbLoading(true);
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(tmdbQuery)}&api_key=${apiKey}&language=es-ES`
      );
      const data = await res.json();
      setTmdbResults(
        (data.results ?? []).filter((r: TmdbResult) => r.media_type === "movie" || r.media_type === "tv")
      );
    } catch {
      toast.error("Error buscando en TMDB");
    } finally {
      setTmdbLoading(false);
    }
  }

  function selectTmdb(r: TmdbResult) {
    setSelectedTmdb(r);
    setAddForm(f => ({
      ...f,
      title:     r.title ?? r.name ?? "",
      type:      r.media_type === "tv" ? "series" : "movie",
      overview:  r.overview ?? "",
      poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : "",
      rating:    String(r.vote_average?.toFixed(1) ?? ""),
      year:      String((r.release_date ?? r.first_air_date ?? "").slice(0, 4)),
    }));
    setTmdbResults([]);
  }

  function clearTmdb() {
    setSelectedTmdb(null);
    setAddForm(f => ({ ...f, poster_url: "", rating: "", year: "", overview: "" }));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Open add dialog
  // ─────────────────────────────────────────────────────────────────────────────

  function openAdd() {
    setAddStep(1);
    setTmdbQuery("");
    setTmdbResults([]);
    setSelectedTmdb(null);
    setAddForm({ ...EMPTY_ADD, server_id: servers[0]?.id ?? "" });
    setAddOpen(true);
  }

  function goToStep2() { setAddStep(2); }
  function goToStep1() { setAddStep(1); }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Save new item
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleAdd() {
    if (!addForm.title.trim()) { toast.error("El título es requerido"); return; }
    setAddSaving(true);
    try {
      const { error } = await ownerSupabase.from("vod_items").insert({
        title:      addForm.title.trim(),
        type:       addForm.type,
        server_id:  addForm.server_id || null,
        file_path:  addForm.file_path.trim() || null,
        stream_url: addForm.stream_url.trim() || null,
        poster_url: addForm.poster_url || null,
        overview:   addForm.overview || null,
        rating:     addForm.rating ? parseFloat(addForm.rating) : null,
        year:       addForm.year   ? parseInt(addForm.year, 10) : null,
        tmdb_id:    selectedTmdb?.id ?? null,
        genres:     [],
        cast_list:  [],
        active:     true,
      });
      if (error) throw error;
      toast.success("Contenido añadido");
      setAddOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setAddSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Edit existing item
  // ─────────────────────────────────────────────────────────────────────────────

  function openEdit(item: VodItem) {
    setEditItem(item);
    setEditForm({
      title:      item.title,
      type:       item.type,
      server_id:  item.server_id ?? "",
      file_path:  item.file_path ?? "",
      stream_url: item.stream_url ?? "",
      poster_url: item.poster_url ?? "",
      rating:     item.rating != null ? String(item.rating) : "",
      year:       item.year   != null ? String(item.year)   : "",
      overview:   item.overview ?? "",
    });
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!editItem || !editForm.title.trim()) { toast.error("El título es requerido"); return; }
    setEditSaving(true);
    try {
      const { error } = await ownerSupabase.from("vod_items").update({
        title:      editForm.title.trim(),
        type:       editForm.type,
        server_id:  editForm.server_id || null,
        file_path:  editForm.file_path.trim() || null,
        stream_url: editForm.stream_url.trim() || null,
        poster_url: editForm.poster_url || null,
        overview:   editForm.overview || null,
        rating:     editForm.rating ? parseFloat(editForm.rating) : null,
        year:       editForm.year   ? parseInt(editForm.year, 10) : null,
      }).eq("id", editItem.id);
      if (error) throw error;
      toast.success("Cambios guardados");
      setEditOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setEditSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Toggle active
  // ─────────────────────────────────────────────────────────────────────────────

  async function toggleActive(item: VodItem) {
    await ownerSupabase.from("vod_items").update({ active: !item.active }).eq("id", item.id);
    toast.success(item.active ? "Desactivado" : "Activado");
    loadAll();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Delete
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("vod_items").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Error eliminando"); return; }
    toast.success(`"${deleteTarget.title}" eliminado`);
    setDeleteTarget(null);
    setDeleteConfirm(false);
    loadAll();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Bulk import
  // ─────────────────────────────────────────────────────────────────────────────

  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Accept CSV (first column) or plain text (one filename per line)
      const lines = text
        .split(/\r?\n/)
        .map(l => l.split(",")[0].trim().replace(/^"(.*)"$/, "$1"))
        .filter(Boolean);
      setBulkForm(f => ({ ...f, file_list: lines.join("\n") }));
      setBulkTab("text");
    };
    reader.readAsText(file);
  }

  const bulkFileNames = useMemo(() =>
    bulkForm.file_list.split("\n").map(s => s.trim()).filter(Boolean),
    [bulkForm.file_list]);

  async function handleBulkImport() {
    if (!bulkForm.server_id)      { toast.error("Selecciona un servidor"); return; }
    if (!bulkFileNames.length)    { toast.error("La lista de archivos está vacía"); return; }

    setBulkImporting(true);
    let success = 0, failed = 0;
    const base = bulkForm.base_path.replace(/\/$/, "");

    for (const fileName of bulkFileNames) {
      const filePath = base ? `${base}/${fileName}` : fileName;
      // Derive a human title from the filename (strip extension, replace separators)
      const title = fileName.replace(/\.[^.]+$/, "").replace(/[._\-]+/g, " ").trim();

      const { error } = await ownerSupabase.from("vod_items").insert({
        server_id:  bulkForm.server_id,
        type:       bulkForm.type,
        title,
        file_path:  filePath,
        genres:     [],
        cast_list:  [],
        active:     true,
      });
      if (error) failed++; else success++;
    }

    setBulkImporting(false);
    if (success > 0) {
      toast.success(`${success} archivo${success !== 1 ? "s" : ""} importado${success !== 1 ? "s" : ""}`);
      setBulkOpen(false);
      setBulkForm(EMPTY_BULK);
      loadAll();
    }
    if (failed > 0) toast.error(`${failed} archivo${failed !== 1 ? "s" : ""} no pudo importarse`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Navigate to series detail
  // ─────────────────────────────────────────────────────────────────────────────

  function goToDetail(item: VodItem) {
    navigate(`${baseRoute}/vod/${item.id}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setBulkForm(EMPTY_BULK); setBulkTab("text"); setBulkOpen(true); }}
            className="gap-1.5 h-8 text-sm"
          >
            <FolderOpen className="size-3.5" /> Importación masiva
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            className="bg-violet-600 hover:bg-violet-700 gap-1.5 h-8"
          >
            <Plus className="size-4" /> Agregar contenido
          </Button>
        </div>
      </div>

      {/* ── Tabs (type filter) ── */}
      <Tabs value={tabType} onValueChange={v => setTabType(v as typeof tabType)}>
        <TabsList className="h-8">
          <TabsTrigger value="all"    className="text-xs px-3">Todos ({items.length})</TabsTrigger>
          <TabsTrigger value="movie"  className="text-xs px-3">Películas ({movieCount})</TabsTrigger>
          <TabsTrigger value="series" className="text-xs px-3">Series ({seriesCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ── Search + status filter ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 w-52 text-sm pr-7"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Solo activos</SelectItem>
            <SelectItem value="inactive">Solo inactivos</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setFilterStatus("all"); }}>
            <X className="size-3 mr-1" /> Limpiar
          </Button>
        )}
        {hasFilters && (
          <span className="text-xs text-muted-foreground">{filtered.length} de {items.length}</span>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <GridSkeletons />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Film className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "Sin resultados para los filtros aplicados." : "No hay contenido VOD aún."}
          </p>
          {!hasFilters && (
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAdd}>
              <Plus className="size-3.5" /> Agregar primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`group rounded-xl border border-border bg-card overflow-hidden transition-opacity ${!item.active ? "opacity-50" : ""}`}
            >
              {/* Poster */}
              <div className="relative w-full aspect-[2/3] bg-muted">
                {item.poster_url ? (
                  <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.type === "series"
                      ? <Tv className="size-8 text-muted-foreground/30" />
                      : <Film className="size-8 text-muted-foreground/30" />}
                  </div>
                )}

                {/* Type badge — top-left */}
                <span className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  item.type === "series" ? "bg-violet-600/90 text-white" : "bg-blue-600/90 text-white"
                }`}>
                  {item.type === "series" ? "Serie" : "Película"}
                </span>

                {/* Rating — top-right */}
                {item.rating != null && (
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-400">
                    <Star className="size-2.5 fill-yellow-400" />
                    {item.rating.toFixed(1)}
                  </span>
                )}

                {/* Inactive badge */}
                {!item.active && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                    Inactivo
                  </span>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1.5 gap-1">
                  {item.type === "series" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-xs bg-white/90 hover:bg-white text-foreground"
                      onClick={() => goToDetail(item)}
                    >
                      Episodios <ChevronRight className="size-3 ml-0.5" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon"
                        className="size-7 bg-white/90 hover:bg-white text-foreground shrink-0">
                        <MoreHorizontal className="size-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(item)}>Editar</DropdownMenuItem>
                      {item.type === "series" && (
                        <DropdownMenuItem onClick={() => goToDetail(item)}>
                          Gestionar episodios
                        </DropdownMenuItem>
                      )}
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
              <div className="p-2.5 space-y-0.5">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {item.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {item.year ?? "—"}
                  {item.server_id && serverName[item.server_id] && (
                    <> · <span className="truncate">{serverName[item.server_id]}</span></>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          Add Item Dialog (2 steps)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) setAddOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {addStep === 1 ? (
                <><Search className="size-4 text-violet-600" /> Agregar contenido — Paso 1: Buscar en TMDB</>
              ) : (
                <><Film className="size-4 text-violet-600" /> Agregar contenido — Paso 2: Detalles</>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-1">
            {[1, 2].map(n => (
              <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${
                n <= addStep ? "bg-violet-600" : "bg-muted"
              }`} />
            ))}
          </div>

          {/* ── Step 1: TMDB ── */}
          {addStep === 1 && (
            <div className="space-y-3 mt-2">
              <p className="text-xs text-muted-foreground">
                Busca la película o serie en TMDB para importar póster, año y calificación automáticamente.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar en TMDB..."
                  value={tmdbQuery}
                  onChange={e => setTmdbQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchTmdb()}
                  className="flex-1 h-8 text-sm"
                />
                <Button variant="outline" size="icon" className="size-8 shrink-0"
                  onClick={searchTmdb} disabled={tmdbLoading}>
                  {tmdbLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              </div>

              {/* Results */}
              {tmdbResults.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border max-h-56 overflow-y-auto">
                  {tmdbResults.map(r => (
                    <button key={r.id} onClick={() => selectTmdb(r)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted text-left transition-colors">
                      {r.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                          className="h-12 w-8 rounded object-cover shrink-0" alt="" />
                      ) : (
                        <div className="h-12 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <Film className="size-4 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{r.title ?? r.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.media_type === "tv" ? "Serie" : "Película"} ·{" "}
                          {(r.release_date ?? r.first_air_date ?? "").slice(0, 4) || "—"}
                        </p>
                      </div>
                      {r.vote_average > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 text-[10px] text-yellow-600 shrink-0">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          {r.vote_average.toFixed(1)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected chip */}
              {selectedTmdb && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-400">
                  {selectedTmdb.poster_path && (
                    <img src={`https://image.tmdb.org/t/p/w92${selectedTmdb.poster_path}`}
                      className="h-8 w-6 rounded object-cover shrink-0" alt="" />
                  )}
                  <span className="font-medium truncate flex-1">{selectedTmdb.title ?? selectedTmdb.name}</span>
                  <button onClick={clearTmdb} className="shrink-0 hover:text-green-900">
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {addStep === 2 && (
            <div className="space-y-3 mt-2">
              {/* Poster preview if TMDB selected */}
              {addForm.poster_url && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-2.5">
                  <img src={addForm.poster_url} alt="" className="h-16 w-11 rounded object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{addForm.title}</p>
                    <p className="text-[11px] text-muted-foreground">{addForm.year} · {addForm.type === "series" ? "Serie" : "Película"}</p>
                    {addForm.rating && (
                      <p className="text-[11px] text-yellow-600 flex items-center gap-0.5 mt-0.5">
                        <Star className="size-2.5 fill-yellow-400 text-yellow-400" /> {addForm.rating}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Title */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Título *</Label>
                  <Input value={addForm.title}
                    onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                    className="h-8 text-sm" />
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={addForm.type}
                    onValueChange={v => setAddForm(f => ({ ...f, type: v as VodType }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="movie">Película</SelectItem>
                      <SelectItem value="series">Serie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Año</Label>
                  <Input type="number" placeholder="2024" value={addForm.year}
                    onChange={e => setAddForm(f => ({ ...f, year: e.target.value }))}
                    className="h-8 text-sm" />
                </div>

                {/* Server */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Servidor</Label>
                  <Select value={addForm.server_id || "__none__"}
                    onValueChange={v => setAddForm(f => ({ ...f, server_id: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar servidor..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ninguno —</SelectItem>
                      {servers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* File path */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Ruta del archivo en el VPS</Label>
                  <Input placeholder="/mnt/movies/pelicula.mkv" value={addForm.file_path}
                    onChange={e => setAddForm(f => ({ ...f, file_path: e.target.value }))}
                    className="h-8 text-sm font-mono text-xs" />
                </div>

                {/* Stream URL */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">URL de stream <span className="text-muted-foreground">(alternativa a file_path)</span></Label>
                  <Input placeholder="http://servidor:8080/stream/..." value={addForm.stream_url}
                    onChange={e => setAddForm(f => ({ ...f, stream_url: e.target.value }))}
                    className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {addStep === 1 ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
                <Button variant="outline" size="sm" onClick={goToStep2}>
                  Saltar búsqueda <ChevronRight className="size-3.5 ml-1" />
                </Button>
                <Button size="sm" onClick={goToStep2}
                  disabled={!selectedTmdb}
                  className="bg-violet-600 hover:bg-violet-700">
                  Continuar <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goToStep1}>
                  <ArrowLeft className="size-3.5 mr-1" /> Atrás
                </Button>
                <Button size="sm" onClick={handleAdd}
                  disabled={addSaving || !addForm.title.trim()}
                  className="bg-violet-600 hover:bg-violet-700 gap-2">
                  {addSaving && <Loader2 className="size-3.5 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Edit Dialog
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) setEditOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Editar contenido</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {editForm.poster_url && (
              <img src={editForm.poster_url} alt="" className="h-20 rounded object-cover" />
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Título *</Label>
                <Input value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={editForm.type}
                  onValueChange={v => setEditForm(f => ({ ...f, type: v as VodType }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Película</SelectItem>
                    <SelectItem value="series">Serie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Año</Label>
                <Input type="number" placeholder="2024" value={editForm.year}
                  onChange={e => setEditForm(f => ({ ...f, year: e.target.value }))}
                  className="h-8 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Servidor</Label>
                <Select value={editForm.server_id || "__none__"}
                  onValueChange={v => setEditForm(f => ({ ...f, server_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ninguno —</SelectItem>
                    {servers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Ruta del archivo en el VPS</Label>
                <Input placeholder="/mnt/movies/pelicula.mkv" value={editForm.file_path}
                  onChange={e => setEditForm(f => ({ ...f, file_path: e.target.value }))}
                  className="h-8 text-sm font-mono text-xs" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">URL de stream</Label>
                <Input placeholder="http://..." value={editForm.stream_url}
                  onChange={e => setEditForm(f => ({ ...f, stream_url: e.target.value }))}
                  className="h-8 text-sm" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">URL del poster</Label>
                <Input placeholder="https://..." value={editForm.poster_url}
                  onChange={e => setEditForm(f => ({ ...f, poster_url: e.target.value }))}
                  className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rating (0-10)</Label>
                <Input type="number" min={0} max={10} step={0.1} placeholder="8.5"
                  value={editForm.rating}
                  onChange={e => setEditForm(f => ({ ...f, rating: e.target.value }))}
                  className="h-8 text-sm" />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleEdit}
              disabled={editSaving || !editForm.title.trim()}
              className="bg-violet-600 hover:bg-violet-700 gap-2">
              {editSaving && <Loader2 className="size-3.5 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Bulk Import Dialog
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={bulkOpen} onOpenChange={v => { if (!v) setBulkOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="size-4 text-violet-600" /> Importación masiva
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Importa varios archivos a la vez pegando la lista de nombres o subiendo un CSV.
            Se usará la ruta base + nombre de archivo para construir el <code className="bg-muted px-1 rounded">file_path</code> de cada ítem.
          </p>

          <div className="space-y-3 mt-1">
            {/* Server */}
            <div className="space-y-1.5">
              <Label className="text-xs">Servidor *</Label>
              <Select value={bulkForm.server_id || "__none__"}
                onValueChange={v => setBulkForm(f => ({ ...f, server_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar servidor..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Seleccionar —</SelectItem>
                  {servers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de contenido</Label>
              <Select value={bulkForm.type}
                onValueChange={v => setBulkForm(f => ({ ...f, type: v as VodType }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Películas</SelectItem>
                  <SelectItem value="series">Series</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Base path */}
            <div className="space-y-1.5">
              <Label className="text-xs">Ruta base del directorio</Label>
              <Input
                placeholder="/mnt/movies/terror/"
                value={bulkForm.base_path}
                onChange={e => setBulkForm(f => ({ ...f, base_path: e.target.value }))}
                className="h-8 text-sm font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Dejar vacío si los nombres de archivo ya incluyen la ruta completa.
              </p>
            </div>

            {/* File list method */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Lista de archivos *</Label>
                <div className="flex rounded-md border border-border overflow-hidden text-xs">
                  <button
                    onClick={() => setBulkTab("text")}
                    className={`px-2.5 py-1 transition-colors ${bulkTab === "text" ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    Pegar lista
                  </button>
                  <button
                    onClick={() => setBulkTab("csv")}
                    className={`px-2.5 py-1 transition-colors ${bulkTab === "csv" ? "bg-violet-600 text-white" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  >
                    Subir CSV
                  </button>
                </div>
              </div>

              {bulkTab === "text" ? (
                <Textarea
                  placeholder={"pelicula1.mkv\npelicula2.mp4\npelicula3.avi"}
                  value={bulkForm.file_list}
                  onChange={e => setBulkForm(f => ({ ...f, file_list: e.target.value }))}
                  className="font-mono text-xs min-h-[120px] resize-y"
                />
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-2">
                  <Upload className="size-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs text-muted-foreground">Selecciona un archivo CSV o TXT</p>
                  <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()}>
                    Elegir archivo
                  </Button>
                  <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden"
                    onChange={handleCsvFile} />
                  {bulkForm.file_list && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ {bulkFileNames.length} archivo{bulkFileNames.length !== 1 ? "s" : ""} cargado{bulkFileNames.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {bulkFileNames.length > 0 && bulkTab === "text" && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{bulkFileNames.length}</span> archivos detectados
                </p>
              )}
            </div>

            {/* Preview of first path */}
            {bulkFileNames.length > 0 && (
              <div className="rounded-md bg-muted/60 p-2.5 text-[11px] space-y-1">
                <p className="font-medium text-muted-foreground">Vista previa (primeros 3):</p>
                {bulkFileNames.slice(0, 3).map((f, i) => (
                  <p key={i} className="font-mono text-foreground truncate">
                    {bulkForm.base_path.replace(/\/$/, "") ? `${bulkForm.base_path.replace(/\/$/, "")}/${f}` : f}
                  </p>
                ))}
                {bulkFileNames.length > 3 && (
                  <p className="text-muted-foreground">… y {bulkFileNames.length - 3} más</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleBulkImport}
              disabled={bulkImporting || !bulkForm.server_id || bulkFileNames.length === 0}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {bulkImporting ? (
                <><Loader2 className="size-3.5 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="size-3.5" /> Importar {bulkFileNames.length > 0 ? `(${bulkFileNames.length})` : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Delete AlertDialog
      ════════════════════════════════════════════════════════════════════════ */}
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
            <AlertDialogAction onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
