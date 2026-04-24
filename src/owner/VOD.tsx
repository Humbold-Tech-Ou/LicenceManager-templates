import { useEffect, useState } from "react";
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
import { Loader2, Plus, Search, Film, Tv } from "lucide-react";
import { toast } from "sonner";
import type { VodItem, VodType, Server } from "@/types/owner-panel";

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

export default function VOD() {
  const config = useOwnerConfig();
  const [items, setItems] = useState<VodItem[]>([]);
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  // TMDB search
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [selectedTmdb, setSelectedTmdb] = useState<TmdbResult | null>(null);

  // Form
  const [form, setForm] = useState({
    title: "",
    type: "movie" as VodType,
    overview: "",
    poster_url: "",
    stream_url: "",
    server_id: "",
    rating: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

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
      title: r.title ?? r.name ?? "",
      type: r.media_type === "tv" ? "series" : "movie",
      overview: r.overview ?? "",
      poster_url: r.poster_path
        ? `https://image.tmdb.org/t/p/w500${r.poster_path}`
        : "",
      rating: String(r.vote_average?.toFixed(1) ?? ""),
    }));
    setTmdbResults([]);
  }

  function openNew() {
    setForm({
      title: "",
      type: "movie",
      overview: "",
      poster_url: "",
      stream_url: "",
      server_id: servers[0]?.id ?? "",
      rating: "",
    });
    setSelectedTmdb(null);
    setTmdbQuery("");
    setTmdbResults([]);
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.title || !form.stream_url) {
      toast.error("Título y URL de stream son requeridos");
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<VodItem> = {
        title: form.title,
        type: form.type,
        overview: form.overview || null,
        poster_url: form.poster_url || null,
        stream_url: form.stream_url,
        server_id: form.server_id || null,
        rating: form.rating ? parseFloat(form.rating) : null,
        tmdb_id: selectedTmdb?.id ?? null,
        genres: [],
        cast_list: [],
        active: true,
      };
      const { error } = await ownerSupabase.from("vod_items").insert(payload);
      if (error) throw error;
      toast.success("Contenido agregado");
      setSheetOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando contenido");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: VodItem) {
    await ownerSupabase
      .from("vod_items")
      .update({ active: !item.active })
      .eq("id", item.id);
    loadAll();
  }

  const filtered = items.filter((i) => {
    if (filterType !== "all" && i.type !== filterType) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">VOD</h1>
        <Button
          size="sm"
          onClick={openNew}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Plus className="size-4" /> Agregar contenido
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Buscar título..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todo el contenido</option>
          <option value="movie">Películas</option>
          <option value="series">Series</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">No hay contenido VOD aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border border-border bg-card overflow-hidden ${
                !item.active ? "opacity-50" : ""
              }`}
            >
              {item.poster_url ? (
                <img
                  src={item.poster_url}
                  alt={item.title}
                  className="w-full aspect-[2/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center">
                  {item.type === "series" ? (
                    <Tv className="size-8 text-muted-foreground" />
                  ) : (
                    <Film className="size-8 text-muted-foreground" />
                  )}
                </div>
              )}
              <div className="p-3">
                <p className="text-xs font-medium text-foreground line-clamp-1">{item.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                  <button
                    onClick={() => toggleActive(item)}
                    className={`text-xs ${item.active ? "text-green-600" : "text-zinc-400"}`}
                  >
                    {item.active ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agregar contenido VOD</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {/* TMDB Search */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Buscar en TMDB (opcional)</p>
              <div className="flex gap-2">
                <Input
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchTmdb()}
                  placeholder="Buscar película o serie..."
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={searchTmdb}
                  disabled={tmdbLoading}
                >
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
                        <img
                          src={`https://image.tmdb.org/t/p/w92${r.poster_path}`}
                          className="h-10 w-7 rounded object-cover"
                          alt=""
                        />
                      )}
                      <div>
                        <p className="font-medium text-xs">{r.title ?? r.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {r.media_type === "tv" ? "Serie" : "Película"} ·{" "}
                          {(r.release_date ?? r.first_air_date ?? "").slice(0, 4)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as VodType }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="movie">Película</option>
                <option value="series">Serie</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>URL de Stream *</Label>
              <Input
                value={form.stream_url}
                onChange={(e) => setForm((f) => ({ ...f, stream_url: e.target.value }))}
                placeholder="http://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Servidor</Label>
              <select
                value={form.server_id}
                onChange={(e) => setForm((f) => ({ ...f, server_id: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— Ninguno —</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {form.poster_url && (
              <img
                src={form.poster_url}
                alt="Poster"
                className="h-32 rounded-lg object-cover"
              />
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.stream_url}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
