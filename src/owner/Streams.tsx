import { useEffect, useState, useMemo, useRef } from "react";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Plus, Search, Radio, MoreHorizontal, X, Tv2,
  ScanSearch, Copy, Check, Wifi, Zap, Upload, AlertTriangle, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Stream, StreamType, Server } from "@/types/owner-panel";
import { FolderCard } from "@/components/ui/folder-card";

const FOLDER_VARIANTS = ["default", "project", "system", "amber", "emerald", "rose"] as const;

// ── IPTV-Org logo search (cached) ─────────────────────────────────────────────

interface IptvChannel {
  id: string;
  name: string;
  logo: string;
  categories: string[];
  country: string;
}

let _logoCache: IptvChannel[] | null = null;
let _logoFetching = false;
const _logoCallbacks: Array<(ch: IptvChannel[]) => void> = [];

async function fetchLogoDb(): Promise<IptvChannel[]> {
  if (_logoCache) return _logoCache;
  if (_logoFetching) {
    return new Promise(res => _logoCallbacks.push(res));
  }
  _logoFetching = true;
  try {
    const res = await fetch("https://iptv-org.github.io/api/channels.json");
    const data: IptvChannel[] = await res.json();
    _logoCache = data;
    _logoCallbacks.forEach(cb => cb(data));
    _logoCallbacks.length = 0;
    return data;
  } catch {
    _logoFetching = false;
    return [];
  }
}

function searchLogos(db: IptvChannel[], query: string): IptvChannel[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return db
    .filter(c => c.name.toLowerCase().includes(q) && c.logo)
    .sort((a, b) => {
      const aEx = a.name.toLowerCase() === q ? -1 : 0;
      const bEx = b.name.toLowerCase() === q ? -1 : 0;
      return aEx - bEx || a.name.localeCompare(b.name);
    })
    .slice(0, 16);
}

// ── Stream type helpers ───────────────────────────────────────────────────────

const STREAM_TYPE_CONFIG: Record<StreamType, {
  label: string;
  color: string;
  icon: React.ElementType;
  urlPlaceholder: string;
  urlLabel: string;
}> = {
  hls:  { label: "HLS",  color: "bg-blue-100 text-blue-700",   icon: Wifi,  urlPlaceholder: "http://servidor:8080/live/canal/index.m3u8", urlLabel: "URL HLS (.m3u8)" },
  rtmp: { label: "RTMP", color: "bg-orange-100 text-orange-700", icon: Zap,  urlPlaceholder: "rtmp://servidor/live/stream_key",            urlLabel: "URL RTMP" },
  ts:   { label: "TS",   color: "bg-violet-100 text-violet-700", icon: Tv2, urlPlaceholder: "http://servidor:8080/live/canal/stream.ts",   urlLabel: "URL TS (Transport Stream)" },
};

function StreamTypeBadge({ type }: { type: StreamType }) {
  const { label, color } = STREAM_TYPE_CONFIG[type] ?? STREAM_TYPE_CONFIG.hls;
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", color)}>
      {label}
    </span>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  category: string;
  server_id: string;
  stream_url: string;
  stream_type: StreamType;
  epg_id: string;
  logo_url: string;
  sort_order: string;
}

const EMPTY_FORM: FormState = {
  name: "", category: "", server_id: "", stream_url: "",
  stream_type: "hls", epg_id: "", logo_url: "", sort_order: "0",
};

// ── Logo search panel ─────────────────────────────────────────────────────────

function LogoSearchPanel({
  query, setQuery, onSelect,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSelect: (url: string) => void;
}) {
  const [db, setDb] = useState<IptvChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<IptvChannel[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Prefetch on mount
  useEffect(() => {
    setLoading(true);
    fetchLogoDb().then(data => { setDb(data); setLoading(false); });
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      setResults(searchLogos(db, query));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, db]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar canal (CNN, ESPN, HBO...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground self-center" />}
      </div>

      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 max-h-44 overflow-y-auto p-1 rounded-lg border border-border bg-muted/20">
          {results.map(ch => (
            <button
              key={ch.id}
              type="button"
              title={ch.name}
              onClick={() => onSelect(ch.logo)}
              className="flex flex-col items-center gap-1 p-1.5 rounded-md hover:bg-background border border-transparent hover:border-border transition-all group"
            >
              <img
                src={ch.logo}
                alt={ch.name}
                className="h-8 w-full object-contain"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-[9px] text-muted-foreground group-hover:text-foreground truncate w-full text-center leading-tight">
                {ch.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {query && results.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Sin resultados — pega la URL del logo directamente arriba.
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Streams() {
  const [streams,  setStreams]  = useState<Stream[]>([]);
  const [servers,  setServers]  = useState<Server[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | StreamType>("all");

  // Sheet state
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Stream | null>(null);
  const [form,         setForm]         = useState<FormState>(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [logoSearch,   setLogoSearch]   = useState("");
  const [showLogoSearch, setShowLogoSearch] = useState(false);
  const [copied,       setCopied]       = useState<string | null>(null);

  // Delete
  const [deleteTarget,  setDeleteTarget]  = useState<Stream | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [strRes, srvRes] = await Promise.all([
      ownerSupabase.from("streams").select("*").order("sort_order").order("name"),
      ownerSupabase.from("servers").select("id, name, status").eq("status", "active"),
    ]);
    setStreams(strRes.data ?? []);
    setServers(srvRes.data ?? []);
    setLoading(false);
  }

  // Stats
  const activeCount = useMemo(() => streams.filter(s => s.active).length, [streams]);
  const categories  = useMemo(() => {
    const cats = new Set(streams.map(s => s.category ?? "").filter(Boolean));
    return Array.from(cats).sort();
  }, [streams]);

  // Counts per type
  const typeCounts = useMemo(() => {
    const m: Partial<Record<StreamType, number>> = {};
    for (const s of streams) m[s.stream_type] = (m[s.stream_type] ?? 0) + 1;
    return m;
  }, [streams]);

  // Filtered
  const filtered = useMemo(() => streams.filter(s => {
    if (catFilter !== "all" && (s.category ?? "") !== catFilter) return false;
    if (typeFilter !== "all" && s.stream_type !== typeFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [streams, catFilter, typeFilter, search]);

  const serverName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of servers) m[s.id] = s.name;
    return m;
  }, [servers]);

  // ── Open sheet ──
  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, sort_order: String(streams.length + 1) });
    setLogoSearch("");
    setShowLogoSearch(false);
    setSheetOpen(true);
  }

  function openEdit(s: Stream) {
    setEditTarget(s);
    setForm({
      name:        s.name,
      category:    s.category ?? "",
      server_id:   s.server_id ?? "",
      stream_url:  s.stream_url,
      stream_type: s.stream_type ?? "hls",
      epg_id:      s.epg_id ?? "",
      logo_url:    s.logo_url ?? "",
      sort_order:  String(s.sort_order),
    });
    setLogoSearch("");
    setShowLogoSearch(false);
    setSheetOpen(true);
  }

  // ── Save ──
  async function handleSave() {
    if (!form.name.trim())       { toast.error("El nombre es obligatorio"); return; }
    if (!form.stream_url.trim()) { toast.error("La URL del stream es obligatoria"); return; }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        category:    form.category.trim() || null,
        server_id:   form.server_id || null,
        stream_url:  form.stream_url.trim(),
        stream_type: form.stream_type,
        epg_id:      form.epg_id.trim() || null,
        logo_url:    form.logo_url.trim() || null,
        sort_order:  parseInt(form.sort_order) || 0,
        active:      editTarget?.active ?? true,
      };
      const { error } = editTarget
        ? await ownerSupabase.from("streams").update(payload).eq("id", editTarget.id)
        : await ownerSupabase.from("streams").insert(payload);
      if (error) throw error;
      toast.success(editTarget ? "Canal actualizado" : "Canal añadido");
      setSheetOpen(false);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando canal");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ──
  async function toggleActive(s: Stream) {
    await ownerSupabase.from("streams").update({ active: !s.active }).eq("id", s.id);
    toast.success(s.active ? "Canal desactivado" : "Canal activado");
    loadAll();
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("streams").delete().eq("id", deleteTarget.id);
    if (error) { toast.error("Error eliminando canal"); return; }
    toast.success(`"${deleteTarget.name}" eliminado`);
    setDeleteTarget(null);
    setDeleteConfirm(false);
    loadAll();
  }

  // ── Copy URL ──
  function copyUrl(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  // ── M3U Import (with preview + duplicate detection) ──
  const [importingM3u, setImportingM3u] = useState(false);
  const [m3uDialogOpen, setM3uDialogOpen] = useState(false);
  const [m3uPreview, setM3uPreview] = useState<{
    entries: { name: string; url: string; logo: string; category: string; epg: string }[];
    duplicates: Set<string>;
    categories: string[];
    fileName: string;
  } | null>(null);
  const [m3uServerId, setM3uServerId] = useState<string>("");
  const [m3uSkipDuplicates, setM3uSkipDuplicates] = useState(true);

  /** Step 1: Parse M3U and open preview dialog */
  function handleM3uParse(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split("\n");
      const entries: { name: string; url: string; logo: string; category: string; epg: string }[] = [];
      let cur: Partial<typeof entries[0]> = {};

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#EXTINF")) {
          const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
          const groupMatch = trimmed.match(/group-title="([^"]*)"/);
          const epgMatch = trimmed.match(/tvg-id="([^"]*)"/);
          const nameMatch = trimmed.match(/,(.+)$/);
          cur = {
            logo: logoMatch?.[1] || "",
            category: groupMatch?.[1] || "",
            epg: epgMatch?.[1] || "",
            name: nameMatch?.[1]?.trim() || "",
          };
        } else if (trimmed && !trimmed.startsWith("#") && cur.name) {
          entries.push({ name: cur.name, url: trimmed, logo: cur.logo || "", category: cur.category || "", epg: cur.epg || "" });
          cur = {};
        }
      }

      if (entries.length === 0) {
        toast.error("No se encontraron canales en el archivo M3U");
        return;
      }

      // Detect duplicates by stream_url
      const existingUrls = new Set(streams.map((s) => s.stream_url));
      const duplicates = new Set(entries.filter((e) => existingUrls.has(e.url)).map((e) => e.url));

      // Unique categories from parsed entries
      const cats = Array.from(new Set(entries.map((e) => e.category).filter(Boolean))).sort();

      setM3uPreview({ entries, duplicates, categories: cats, fileName: file.name });
      setM3uServerId("");
      setM3uSkipDuplicates(true);
      setM3uDialogOpen(true);
    };
    reader.readAsText(file);
  }

  /** Step 2: Import confirmed entries */
  async function handleM3uConfirmImport() {
    if (!m3uPreview) return;
    setImportingM3u(true);
    try {
      let toInsert = m3uPreview.entries;
      if (m3uSkipDuplicates && m3uPreview.duplicates.size > 0) {
        toInsert = toInsert.filter((e) => !m3uPreview.duplicates.has(e.url));
      }

      if (toInsert.length === 0) {
        toast.info("Todos los canales ya existen. Nada que importar.");
        setM3uDialogOpen(false);
        return;
      }

      const payload = toInsert.map((e, i) => ({
        name: e.name,
        stream_url: e.url,
        stream_type: e.url.includes(".m3u8") ? "hls" : e.url.startsWith("rtmp://") ? "rtmp" : "ts",
        logo_url: e.logo || null,
        category: e.category || null,
        epg_id: e.epg || null,
        server_id: m3uServerId || null,
        sort_order: streams.length + i + 1,
        active: true,
      }));

      const { error } = await ownerSupabase.from("streams").insert(payload);
      if (error) throw error;
      toast.success(`${toInsert.length} canales importados desde M3U`);
      setM3uDialogOpen(false);
      setM3uPreview(null);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error importando M3U");
    } finally {
      setImportingM3u(false);
    }
  }

  const typeConfig = STREAM_TYPE_CONFIG[form.stream_type];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Canales Live</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{streams.length}</span> canales ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos
              {Object.entries(typeCounts).map(([t, c]) => (
                <> · <span key={t} className="text-muted-foreground">{c} {t.toUpperCase()}</span></>
              ))}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5" asChild disabled={importingM3u}>
            <label className="cursor-pointer">
              {importingM3u ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Importar M3U
              <input type="file" accept=".m3u,.m3u8" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleM3uParse(f); e.target.value = ""; }} />
            </label>
          </Button>
          <Button size="sm" onClick={openAdd} className="bg-violet-600 hover:bg-violet-700 gap-1.5">
            <Plus className="size-4" /> Añadir canal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
      </div>

      {/* ── Folder shortcuts by category ── */}
      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <FolderCard
            title="Todos los canales"
            size={`${streams.length} canales`}
            icon={<Radio />}
            variant="default"
            onClick={() => setCatFilter("all")}
          />
          {categories.slice(0, 5).map((c, i) => {
            const count = streams.filter(s => s.category === c).length;
            return (
              <FolderCard
                key={c}
                title={c}
                size={`${count} canales`}
                icon={<Tv2 />}
                variant={FOLDER_VARIANTS[(i + 1) % FOLDER_VARIANTS.length]}
                onClick={() => setCatFilter(c)}
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Buscar canal..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 w-44 text-sm pr-7" />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={v => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="hls">HLS</SelectItem>
            <SelectItem value="rtmp">RTMP</SelectItem>
            <SelectItem value="ts">TS</SelectItem>
          </SelectContent>
        </Select>

        {(search || catFilter !== "all" || typeFilter !== "all") && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setCatFilter("all"); setTypeFilter("all"); }}>
            <X className="size-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Radio className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {search || catFilter !== "all" || typeFilter !== "all"
              ? "Sin canales que coincidan con los filtros."
              : "No hay canales aún. Añade el primero."}
          </p>
          {!search && catFilter === "all" && typeFilter === "all" && (
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openAdd}>
              <Plus className="size-3.5" /> Añadir canal
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium w-10" />
                <th className="px-4 py-3 font-medium">Canal</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">URL</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(s => (
                <tr key={s.id}
                  className={cn("hover:bg-muted/20 transition-colors", !s.active && "opacity-50")}>
                  {/* Logo */}
                  <td className="px-3 py-2.5">
                    <div className="size-9 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name}
                          className="size-full object-contain p-1"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <Tv2 className="size-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </td>
                  {/* Name + server */}
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-foreground">{s.name}</p>
                    {s.server_id && serverName[s.server_id] && (
                      <p className="text-xs text-muted-foreground">{serverName[s.server_id]}</p>
                    )}
                    {s.epg_id && (
                      <p className="text-[11px] text-muted-foreground/70 font-mono">{s.epg_id}</p>
                    )}
                  </td>
                  {/* Type */}
                  <td className="px-4 py-2.5">
                    <StreamTypeBadge type={s.stream_type ?? "hls"} />
                  </td>
                  {/* Category */}
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">
                    {s.category ?? "—"}
                  </td>
                  {/* URL */}
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 max-w-[200px]">
                      <span className="text-xs font-mono text-muted-foreground truncate">
                        {s.stream_url}
                      </span>
                      <button onClick={() => copyUrl(s.stream_url)}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        {copied === s.stream_url
                          ? <Check className="size-3 text-green-500" />
                          : <Copy className="size-3" />}
                      </button>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      s.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"
                    )}>
                      {s.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(s)}>Editar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyUrl(s.stream_url)}>
                          Copiar URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(s)}>
                          {s.active ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600"
                          onClick={() => { setDeleteTarget(s); setDeleteConfirm(true); }}>
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length !== streams.length && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Mostrando {filtered.length} de {streams.length} canales
            </p>
          )}
        </div>
      )}

      {/* ── Add / Edit Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) setSheetOpen(false); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editTarget ? "Editar canal" : "Nuevo canal"}</SheetTitle>
          </SheetHeader>

          <div className="mt-5 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input placeholder="CNN International" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* Stream type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de stream</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["hls", "rtmp", "ts"] as StreamType[]).map(t => {
                  const c = STREAM_TYPE_CONFIG[t];
                  const Icon = c.icon;
                  return (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, stream_type: t }))}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-xs font-medium",
                        form.stream_type === t
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-border text-muted-foreground hover:border-violet-200 hover:bg-muted/40"
                      )}>
                      <Icon className="size-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">{typeConfig.urlPlaceholder}</p>
            </div>

            {/* Stream URL */}
            <div className="space-y-1.5">
              <Label className="text-xs">{typeConfig.urlLabel} *</Label>
              <Input
                placeholder={typeConfig.urlPlaceholder}
                value={form.stream_url}
                onChange={e => setForm(f => ({ ...f, stream_url: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>

            {/* Category + Server */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Input placeholder="Noticias, Deportes..." value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  list="cat-list" />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Servidor</Label>
                <Select value={form.server_id || "__none__"}
                  onValueChange={v => setForm(f => ({ ...f, server_id: v === "__none__" ? "" : v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Ninguno —</SelectItem>
                    {servers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* EPG + Sort */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">ID EPG</Label>
                <Input placeholder="CNN.us" value={form.epg_id}
                  onChange={e => setForm(f => ({ ...f, epg_id: e.target.value }))}
                  className="font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Orden</Label>
                <Input type="number" min={0} value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
              </div>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Logo del canal</Label>
                <button type="button"
                  onClick={() => setShowLogoSearch(v => !v)}
                  className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800">
                  <ScanSearch className="size-3.5" />
                  {showLogoSearch ? "Ocultar buscador" : "Buscar logo"}
                </button>
              </div>

              {/* Logo preview + URL input */}
              <div className="flex items-center gap-2">
                <div className="size-10 rounded-md border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="" className="size-full object-contain p-1"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <Tv2 className="size-4 text-muted-foreground/40" />
                  )}
                </div>
                <Input
                  placeholder="https://logo.url/canal.png"
                  value={form.logo_url}
                  onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                  className="flex-1 text-xs font-mono"
                />
                {form.logo_url && (
                  <button onClick={() => setForm(f => ({ ...f, logo_url: "" }))}
                    className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Logo search panel */}
              {showLogoSearch && (
                <div className="rounded-lg border border-violet-200 bg-violet-50/30 p-3 space-y-2">
                  <LogoSearchPanel
                    query={logoSearch}
                    setQuery={setLogoSearch}
                    onSelect={url => {
                      setForm(f => ({ ...f, logo_url: url }));
                      setShowLogoSearch(false);
                      setLogoSearch("");
                    }}
                  />
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.stream_url.trim()}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2">
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editTarget ? "Guardar cambios" : "Añadir canal"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>.
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

      {/* ── M3U Preview Dialog ── */}
      <Dialog open={m3uDialogOpen} onOpenChange={(o) => { if (!importingM3u) setM3uDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-violet-600" />
              Vista previa de importación M3U
            </DialogTitle>
            <DialogDescription>
              {m3uPreview?.fileName ?? "archivo.m3u"} — Revisa los canales antes de importarlos.
            </DialogDescription>
          </DialogHeader>

          {m3uPreview && (
            <div className="space-y-4 py-2">
              {/* Summary stats */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-1.5 font-medium text-violet-700">
                  <Radio className="size-4" />
                  {m3uPreview.entries.length} canales
                </span>
                <span className="text-muted-foreground">
                  {m3uPreview.categories.length} categoría{m3uPreview.categories.length !== 1 ? "s" : ""}
                </span>
                {m3uPreview.duplicates.size > 0 && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                    <AlertTriangle className="size-4" />
                    {m3uPreview.duplicates.size} duplicado{m3uPreview.duplicates.size !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Duplicate handling toggle */}
              {m3uPreview.duplicates.size > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">
                      {m3uPreview.duplicates.size} canal{m3uPreview.duplicates.size !== 1 ? "es ya existen" : " ya existe"} (misma URL)
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {m3uSkipDuplicates
                        ? `Se importarán ${m3uPreview.entries.length - m3uPreview.duplicates.size} canales nuevos.`
                        : `Se importarán todos (${m3uPreview.entries.length}), incluyendo duplicados.`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={m3uSkipDuplicates ? "default" : "outline"}
                    onClick={() => setM3uSkipDuplicates((v) => !v)}
                    className={m3uSkipDuplicates ? "bg-amber-600 hover:bg-amber-700 text-xs" : "text-xs"}
                  >
                    {m3uSkipDuplicates ? "Omitir duplicados" : "Incluir duplicados"}
                  </Button>
                </div>
              )}

              {/* Server assignment */}
              <div className="space-y-1.5">
                <Label className="text-xs">Asignar servidor a todos los canales (opcional)</Label>
                <Select value={m3uServerId || "__none__"} onValueChange={(v) => setM3uServerId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="— Sin servidor —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Sin servidor —</SelectItem>
                    {servers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium w-8">#</th>
                        <th className="px-3 py-2 font-medium">Canal</th>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Categoría</th>
                        <th className="px-3 py-2 font-medium w-16">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {m3uPreview.entries.slice(0, 100).map((e, i) => {
                        const isDup = m3uPreview.duplicates.has(e.url);
                        const type = e.url.includes(".m3u8") ? "HLS" : e.url.startsWith("rtmp://") ? "RTMP" : "TS";
                        return (
                          <tr
                            key={i}
                            className={cn(
                              "transition-colors",
                              isDup && m3uSkipDuplicates ? "opacity-40 bg-amber-50/50" : "hover:bg-muted/20"
                            )}
                          >
                            <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                {e.logo && (
                                  <img
                                    src={e.logo}
                                    alt=""
                                    className="size-5 rounded object-contain shrink-0"
                                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <span className="font-medium text-foreground truncate max-w-[200px]">{e.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={cn(
                                "inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                type === "HLS" ? "bg-blue-100 text-blue-700" :
                                type === "RTMP" ? "bg-orange-100 text-orange-700" :
                                "bg-violet-100 text-violet-700"
                              )}>
                                {type}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">{e.category || "—"}</td>
                            <td className="px-3 py-1.5">
                              {isDup ? (
                                <span className="text-amber-600 font-medium">Dup</span>
                              ) : (
                                <span className="text-green-600 font-medium">Nuevo</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {m3uPreview.entries.length > 100 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border bg-muted/20">
                    Mostrando 100 de {m3uPreview.entries.length} canales
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setM3uDialogOpen(false)} disabled={importingM3u}>
              Cancelar
            </Button>
            <Button
              onClick={handleM3uConfirmImport}
              disabled={importingM3u || !m3uPreview}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {importingM3u && <Loader2 className="size-4 animate-spin" />}
              Importar{" "}
              {m3uPreview
                ? m3uSkipDuplicates
                  ? `${m3uPreview.entries.length - m3uPreview.duplicates.size} canales`
                  : `${m3uPreview.entries.length} canales`
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
