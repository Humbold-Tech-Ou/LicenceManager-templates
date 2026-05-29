import { useState } from "react";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Globe, Check, X, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LICENSE_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
const LICENSE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";

interface Channel {
  name: string;
  tvg_id: string | null;
  group: string | null;
  logo: string | null;
  url: string;
}

export default function M3uUrlImportDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImported?: () => void;
}) {
  const tenantToken = (import.meta.env.VITE_TENANT_TOKEN as string | undefined) ?? "";

  const [step, setStep] = useState<"url" | "preview">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [label, setLabel] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshHours, setRefreshHours] = useState("24");

  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setStep("url");
    setSourceUrl("");
    setLabel("");
    setAutoRefresh(true);
    setRefreshHours("24");
    setChannels([]);
    setSelected(new Set());
    setSearch("");
    setGroupFilter(null);
  }

  async function fetchPreview() {
    if (!sourceUrl.trim()) {
      toast.error("Falta la URL");
      return;
    }
    if (!tenantToken) {
      toast.error("Esta función no está disponible en preview");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/parse-m3u`, {
        method: "POST",
        headers: {
          apikey: LICENSE_ANON,
          Authorization: `Bearer ${LICENSE_ANON}`,
          "X-Tenant-Token": tenantToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source_url: sourceUrl.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error parseando M3U");
      setChannels(j.channels ?? []);
      // Pre-select all by default
      setSelected(new Set((j.channels ?? []).map((_: any, i: number) => i)));
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function doImport() {
    if (selected.size === 0) {
      toast.error("Selecciona al menos un canal");
      return;
    }
    setImporting(true);
    try {
      // 1. Create the m3u_imports row
      const { data: imp, error: impErr } = await ownerSupabase
        .from("m3u_imports")
        .insert({
          source_url: sourceUrl.trim(),
          label: label.trim() || null,
          auto_refresh: autoRefresh,
          refresh_interval_hours: parseInt(refreshHours) || 24,
        })
        .select("id")
        .single();
      if (impErr) throw impErr;

      // 2. Apply import for selected channels
      const toApply = Array.from(selected).map((i) => channels[i]).filter(Boolean);
      const res = await fetch(`${LICENSE_URL}/functions/v1/apply-m3u-import`, {
        method: "POST",
        headers: {
          apikey: LICENSE_ANON,
          Authorization: `Bearer ${LICENSE_ANON}`,
          "X-Tenant-Token": tenantToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ import_id: imp.id, channels: toApply }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error importando");
      toast.success(
        `Importación completa: +${j.added} nuevos · ${j.updated} actualizados · ${j.skipped} sin cambios`,
      );
      onImported?.();
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setImporting(false);
    }
  }

  // Derived: list of groups + filtered list
  const groups = Array.from(new Set(channels.map((c) => c.group).filter(Boolean))) as string[];
  const filtered = channels
    .map((c, i) => ({ i, c }))
    .filter(({ c }) => (!groupFilter || c.group === groupFilter)
      && (!search.trim() || c.name.toLowerCase().includes(search.toLowerCase())));

  function toggleAll() {
    const visibleIdx = filtered.map((f) => f.i);
    const allSelected = visibleIdx.every((i) => selected.has(i));
    const next = new Set(selected);
    if (allSelected) visibleIdx.forEach((i) => next.delete(i));
    else visibleIdx.forEach((i) => next.add(i));
    setSelected(next);
  }
  function toggleOne(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" /> Importar canales desde URL M3U
          </DialogTitle>
          <DialogDescription>
            {step === "url"
              ? "Pega una URL M3U pública (ej. iptv-org.github.io) y el sistema parseará los canales."
              : `${channels.length} canales detectados — selecciona cuáles importar.`}
          </DialogDescription>
        </DialogHeader>

        {step === "url" && (
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">URL M3U</Label>
              <Input
                placeholder="https://iptv-org.github.io/iptv/categories/news.m3u"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Etiqueta (opcional)</Label>
              <Input
                placeholder="iptv-org Noticias"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="size-4"
                />
                Auto-refresh
              </label>
              {autoRefresh && (
                <>
                  <span className="text-xs text-muted-foreground">cada</span>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    value={refreshHours}
                    onChange={(e) => setRefreshHours(e.target.value)}
                    className="w-20 h-7 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">horas</span>
                </>
              )}
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 flex flex-col gap-2 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar nombre…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-8 text-xs"
                />
              </div>
              {groups.length > 0 && (
                <select
                  value={groupFilter ?? ""}
                  onChange={(e) => setGroupFilter(e.target.value || null)}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2"
                >
                  <option value="">Todos los grupos ({groups.length})</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={toggleAll}>
                {filtered.every((f) => selected.has(f.i)) && filtered.length > 0
                  ? <><X className="size-3" /> Deseleccionar visibles</>
                  : <><Check className="size-3" /> Seleccionar visibles</>}
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {selected.size} de {channels.length} seleccionados
              </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filtered.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Sin coincidencias</p>
              ) : (
                filtered.map(({ i, c }) => (
                  <label
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/30 text-xs",
                      selected.has(i) && "bg-violet-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleOne(i)}
                      className="size-3.5"
                    />
                    {c.logo ? (
                      <img src={c.logo} alt="" className="size-6 rounded object-contain shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="size-6 rounded bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.group ?? "Sin grupo"} {c.tvg_id ? `· ${c.tvg_id}` : ""}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "url" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={fetchPreview}
                disabled={loading || !sourceUrl.trim()}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                Vista previa
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("url")} disabled={importing}>
                Atrás
              </Button>
              <Button
                onClick={doImport}
                disabled={importing || selected.size === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              >
                {importing && <Loader2 className="size-4 animate-spin" />}
                Importar {selected.size} canales
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
