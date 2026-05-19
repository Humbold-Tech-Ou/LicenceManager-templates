import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Film, Tv, Radio, ListMusic, ArrowRight, Loader2 } from "lucide-react";
import { FolderCard } from "@/components/ui/folder-card";
import { Button } from "@/components/ui/button";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import type { VodItem, Stream, Bouquet } from "@/types/owner-panel";

// ── Category IDs ──────────────────────────────────────────────────────────────
type CategoryKey = "movies" | "series" | "streams" | "bouquets";

interface CategoryCounts {
  movies: number;
  series: number;
  streams: number;
  bouquets: number;
}

// ── Mini content previews ─────────────────────────────────────────────────────
function MovieGrid({ items, onViewAll }: { items: VodItem[]; onViewAll: () => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {items.map((v) => (
          <div key={v.id} className="group relative rounded-lg overflow-hidden bg-zinc-100 aspect-[2/3]">
            {v.poster_url ? (
              <img
                src={v.poster_url}
                alt={v.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="size-6 text-zinc-400" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-[10px] font-medium truncate">{v.title}</p>
              {v.year && <p className="text-white/60 text-[9px]">{v.year}</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1.5 text-xs">
          Ver todos <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function StreamList({ items, onViewAll }: { items: Stream[]; onViewAll: () => void }) {
  return (
    <div className="space-y-3">
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {items.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/30 transition-colors">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} className="size-7 object-contain rounded shrink-0" />
            ) : (
              <div className="size-7 rounded bg-cyan-100 flex items-center justify-center shrink-0">
                <Radio className="size-3.5 text-cyan-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground truncate">{s.category ?? "Sin categoría"}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
              {s.active ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1.5 text-xs">
          Ver todos <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function BouquetList({ items, onViewAll }: { items: Bouquet[]; onViewAll: () => void }) {
  return (
    <div className="space-y-3">
      <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
        {items.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/30 transition-colors">
            <div className="size-7 rounded bg-amber-100 flex items-center justify-center shrink-0">
              <ListMusic className="size-3.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{b.name}</p>
              {b.description && (
                <p className="text-xs text-muted-foreground truncate">{b.description}</p>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${b.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
              {b.active ? "Activo" : "Inactivo"}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1.5 text-xs">
          Ver todos <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Library() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/owner-preview");
  const base = isPreview ? "/owner-preview" : "/owner";

  const [active, setActive] = useState<CategoryKey | null>(null);
  const [counts, setCounts] = useState<CategoryCounts>({ movies: 0, series: 0, streams: 0, bouquets: 0 });
  const [countsLoading, setCountsLoading] = useState(true);

  // Category content
  const [movies, setMovies]     = useState<VodItem[]>([]);
  const [series, setSeries]     = useState<VodItem[]>([]);
  const [streams, setStreams]   = useState<Stream[]>([]);
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  // Load counts on mount
  useEffect(() => {
    async function loadCounts() {
      setCountsLoading(true);
      const [movRes, serRes, stRes, bqRes] = await Promise.all([
        ownerSupabase.from("vod_items").select("id", { count: "exact", head: true }).eq("type", "movie"),
        ownerSupabase.from("vod_items").select("id", { count: "exact", head: true }).eq("type", "series"),
        ownerSupabase.from("streams").select("id", { count: "exact", head: true }),
        ownerSupabase.from("bouquets").select("id", { count: "exact", head: true }),
      ]);
      setCounts({
        movies:   movRes.count ?? 0,
        series:   serRes.count ?? 0,
        streams:  stRes.count  ?? 0,
        bouquets: bqRes.count  ?? 0,
      });
      setCountsLoading(false);
    }
    loadCounts();
  }, []);

  // Load category content when a folder is clicked
  async function handleFolderClick(key: CategoryKey) {
    if (active === key) { setActive(null); return; }
    setActive(key);
    setContentLoading(true);

    if (key === "movies" && movies.length === 0) {
      const { data } = await ownerSupabase
        .from("vod_items").select("id,title,poster_url,year,type")
        .eq("type", "movie").order("created_at", { ascending: false }).limit(16);
      setMovies((data ?? []) as VodItem[]);
    }
    if (key === "series" && series.length === 0) {
      const { data } = await ownerSupabase
        .from("vod_items").select("id,title,poster_url,year,type")
        .eq("type", "series").order("created_at", { ascending: false }).limit(16);
      setSeries((data ?? []) as VodItem[]);
    }
    if (key === "streams" && streams.length === 0) {
      const { data } = await ownerSupabase
        .from("streams").select("id,name,category,logo_url,active")
        .order("sort_order").limit(12);
      setStreams((data ?? []) as Stream[]);
    }
    if (key === "bouquets" && bouquets.length === 0) {
      const { data } = await ownerSupabase
        .from("bouquets").select("id,name,description,active")
        .order("created_at", { ascending: false }).limit(12);
      setBouquets((data ?? []) as Bouquet[]);
    }
    setContentLoading(false);
  }

  const folders: {
    key: CategoryKey;
    title: string;
    icon: React.ReactNode;
    variant: "default" | "project" | "system" | "amber";
    to: string;
  }[] = [
    { key: "movies",   title: "Películas",    icon: <Film />,      variant: "default", to: `${base}/vod` },
    { key: "series",   title: "Series",       icon: <Tv />,        variant: "project", to: `${base}/vod` },
    { key: "streams",  title: "Canales Live", icon: <Radio />,     variant: "system",  to: `${base}/streams` },
    { key: "bouquets", title: "Bouquets",     icon: <ListMusic />, variant: "amber",   to: `${base}/bouquets` },
  ];

  function countLabel(key: CategoryKey) {
    if (countsLoading) return "Cargando…";
    const n = counts[key];
    return n === 0 ? "Sin contenido" : `${n.toLocaleString()} ${n === 1 ? "item" : "items"}`;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Explora tu contenido — haz clic en una carpeta para ver el contenido inline.
        </p>
      </div>

      {/* Folder grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {folders.map((f) => (
          <div key={f.key} className="relative">
            <FolderCard
              title={f.title}
              size={countLabel(f.key)}
              icon={f.icon}
              variant={f.variant}
              onClick={() => handleFolderClick(f.key)}
              className={active === f.key ? "ring-2 ring-violet-400 ring-offset-2" : ""}
            />
            {/* Active indicator dot */}
            {active === f.key && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-violet-500" />
            )}
          </div>
        ))}
      </div>

      {/* Inline content panel */}
      {active && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">
                {folders.find(f => f.key === active)?.title}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {counts[active].toLocaleString()} total
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => navigate(folders.find(f => f.key === active)!.to)}
            >
              Gestionar <ArrowRight className="size-3" />
            </Button>
          </div>

          {/* Content */}
          {contentLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-5 animate-spin text-violet-600" />
            </div>
          ) : (
            <>
              {active === "movies" && (
                movies.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">No hay películas. Agrega contenido desde Gestionar.</p>
                  : <MovieGrid items={movies} onViewAll={() => navigate(`${base}/vod`)} />
              )}
              {active === "series" && (
                series.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">No hay series. Agrega contenido desde Gestionar.</p>
                  : <MovieGrid items={series} onViewAll={() => navigate(`${base}/vod`)} />
              )}
              {active === "streams" && (
                streams.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">No hay canales. Agrega streams desde Gestionar.</p>
                  : <StreamList items={streams} onViewAll={() => navigate(`${base}/streams`)} />
              )}
              {active === "bouquets" && (
                bouquets.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">No hay bouquets creados aún.</p>
                  : <BouquetList items={bouquets} onViewAll={() => navigate(`${base}/bouquets`)} />
              )}
            </>
          )}
        </div>
      )}

      {/* Empty state when nothing selected */}
      {!active && !countsLoading && (
        counts.movies + counts.series + counts.streams + counts.bouquets === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">La biblioteca está vacía</p>
            <p className="text-xs text-muted-foreground">
              Agrega contenido desde VOD, Canales o Bouquets en el sidebar.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            ↑ Haz clic en una carpeta para explorar su contenido
          </p>
        )
      )}
    </div>
  );
}
