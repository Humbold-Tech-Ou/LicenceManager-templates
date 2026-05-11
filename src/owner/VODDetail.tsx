import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, ArrowLeft, Plus, Trash2, Save, Tv, Film,
  ChevronDown, GripVertical, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import type { VodItem, Season, Episode } from "@/types/owner-panel";

// ── Helper: new blank episode ─────────────────────────────────────────────────

function blankEpisode(number: number): Episode {
  return { number, title: "", file_path: null, stream_url: null, duration_min: null };
}

// ── New episode form state ────────────────────────────────────────────────────

interface NewEpState {
  title: string;
  file_path: string;
  stream_url: string;
  duration: string;
}

const BLANK_NEW_EP: NewEpState = { title: "", file_path: "", stream_url: "", duration: "" };

// ── Component ─────────────────────────────────────────────────────────────────

export default function VODDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/owner-preview");
  const backPath  = isPreview ? "/owner-preview/vod" : "/owner/vod";

  // ── Item data
  const [item,    setItem]    = useState<VodItem | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Working copy of seasons
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [dirty,   setDirty]   = useState(false);
  const [saving,  setSaving]  = useState(false);

  // ── New-episode form per season (keyed by season number)
  const [newEp, setNewEp] = useState<Record<number, NewEpState>>({});
  // ── Which season accordion is open
  const [openSeasons, setOpenSeasons] = useState<string[]>([]);

  // ── Delete episode confirm
  const [delEp, setDelEp] = useState<{ seasonNum: number; epNum: number } | null>(null);

  // ── Load
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await ownerSupabase
        .from("vod_items")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        toast.error("Contenido no encontrado");
        navigate(backPath, { replace: true });
        return;
      }
      setItem(data as VodItem);
      const s: Season[] = Array.isArray(data.seasons) ? (data.seasons as Season[]) : [];
      setSeasons(s);
      // Open first season by default
      if (s.length > 0) setOpenSeasons([String(s[0].number)]);
      setLoading(false);
    })();
  }, [id]);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Season CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  function addSeason() {
    const nextNum = seasons.length > 0 ? Math.max(...seasons.map(s => s.number)) + 1 : 1;
    const newSeason: Season = { number: nextNum, episodes: [] };
    setSeasons(prev => [...prev, newSeason].sort((a, b) => a.number - b.number));
    setOpenSeasons(prev => [...prev, String(nextNum)]);
    setDirty(true);
  }

  function removeSeason(num: number) {
    setSeasons(prev => prev.filter(s => s.number !== num));
    setDirty(true);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Episode CRUD
  // ─────────────────────────────────────────────────────────────────────────────

  function getNewEp(seasonNum: number): NewEpState {
    return newEp[seasonNum] ?? BLANK_NEW_EP;
  }

  function setNewEpField(seasonNum: number, field: keyof NewEpState, value: string) {
    setNewEp(prev => ({
      ...prev,
      [seasonNum]: { ...(prev[seasonNum] ?? BLANK_NEW_EP), [field]: value },
    }));
  }

  function addEpisode(seasonNum: number) {
    const epForm = getNewEp(seasonNum);
    if (!epForm.title.trim() && !epForm.file_path.trim()) {
      toast.error("Ingresa al menos el título o la ruta del archivo");
      return;
    }
    const season = seasons.find(s => s.number === seasonNum);
    if (!season) return;
    const nextEpNum = season.episodes.length > 0
      ? Math.max(...season.episodes.map(e => e.number)) + 1
      : 1;
    const episode: Episode = {
      number:      nextEpNum,
      title:       epForm.title.trim() || `Episodio ${nextEpNum}`,
      file_path:   epForm.file_path.trim() || null,
      stream_url:  epForm.stream_url.trim() || null,
      duration_min: epForm.duration ? parseInt(epForm.duration, 10) : null,
    };
    setSeasons(prev => prev.map(s =>
      s.number === seasonNum
        ? { ...s, episodes: [...s.episodes, episode] }
        : s
    ));
    setNewEp(prev => ({ ...prev, [seasonNum]: BLANK_NEW_EP }));
    setDirty(true);
  }

  function confirmRemoveEpisode(seasonNum: number, epNum: number) {
    setDelEp({ seasonNum, epNum });
  }

  function removeEpisode() {
    if (!delEp) return;
    setSeasons(prev => prev.map(s =>
      s.number === delEp.seasonNum
        ? { ...s, episodes: s.episodes.filter(e => e.number !== delEp.epNum) }
        : s
    ));
    setDelEp(null);
    setDirty(true);
  }

  function updateEpisodeField(
    seasonNum: number,
    epNum: number,
    field: keyof Episode,
    value: string | number | null
  ) {
    setSeasons(prev => prev.map(s =>
      s.number === seasonNum
        ? {
            ...s,
            episodes: s.episodes.map(e =>
              e.number === epNum ? { ...e, [field]: value } : e
            ),
          }
        : s
    ));
    setDirty(true);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Save
  // ─────────────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    try {
      const { error } = await ownerSupabase
        .from("vod_items")
        .update({ seasons: seasons.length > 0 ? seasons : null })
        .eq("id", item.id);
      if (error) throw error;
      toast.success("Temporadas guardadas");
      setDirty(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  Render — loading
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-4xl space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-4">
          <Skeleton className="h-36 w-24 rounded-lg shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!item) return null;

  const totalEpisodes = seasons.reduce((acc, s) => acc + s.episodes.length, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  //  Render — main
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl space-y-5">

      {/* ── Back + header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(backPath)}
            className="mt-0.5 h-7 px-2 text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-3">
            {item.poster_url ? (
              <img src={item.poster_url} alt={item.title}
                className="h-20 w-14 rounded-lg object-cover shadow-sm shrink-0" />
            ) : (
              <div className="h-20 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Tv className="size-6 text-muted-foreground/40" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-foreground">{item.title}</h1>
                <span className="rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold">
                  Serie
                </span>
              </div>
              {item.year && <p className="text-sm text-muted-foreground">{item.year}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{seasons.length}</span> temporada{seasons.length !== 1 ? "s" : ""} ·{" "}
                <span className="font-medium text-foreground">{totalEpisodes}</span> episodio{totalEpisodes !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Save + Add season */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={addSeason} className="gap-1.5 h-8">
            <Plus className="size-3.5" /> Temporada
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            className="bg-violet-600 hover:bg-violet-700 gap-1.5 h-8"
          >
            {saving
              ? <><Loader2 className="size-3.5 animate-spin" /> Guardando…</>
              : <><Save className="size-3.5" /> Guardar temporadas</>
            }
          </Button>
        </div>
      </div>

      {dirty && (
        <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-1.5">
          Hay cambios sin guardar. Pulsa "Guardar temporadas" para persistirlos.
        </p>
      )}

      {/* ── Empty state ── */}
      {seasons.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Tv className="size-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay temporadas aún.</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={addSeason}>
            <Plus className="size-3.5" /> Agregar primera temporada
          </Button>
        </div>
      )}

      {/* ── Seasons accordion ── */}
      {seasons.length > 0 && (
        <Accordion
          type="multiple"
          value={openSeasons}
          onValueChange={setOpenSeasons}
          className="space-y-2"
        >
          {seasons.map(season => (
            <AccordionItem
              key={season.number}
              value={String(season.number)}
              className="border border-border rounded-xl overflow-hidden bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 [&[data-state=open]]:bg-muted/30">
                <div className="flex items-center gap-3 flex-1 text-left">
                  <span className="text-sm font-semibold text-foreground">
                    Temporada {season.number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {season.episodes.length} episodio{season.episodes.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-red-600 shrink-0 mr-2"
                  onClick={e => { e.stopPropagation(); removeSeason(season.number); }}
                  title="Eliminar temporada"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 pt-1 space-y-3">

                {/* Episode list */}
                {season.episodes.length > 0 ? (
                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                    {season.episodes.map(ep => (
                      <div key={ep.number} className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/30 group">
                        {/* Episode number */}
                        <span className="text-xs font-mono text-muted-foreground w-6 pt-0.5 shrink-0">
                          {String(ep.number).padStart(2, "0")}
                        </span>

                        {/* Editable fields */}
                        <div className="flex-1 grid grid-cols-1 gap-1.5 min-w-0">
                          <Input
                            value={ep.title}
                            onChange={e => updateEpisodeField(season.number, ep.number, "title", e.target.value)}
                            placeholder="Título del episodio"
                            className="h-7 text-xs"
                          />
                          <Input
                            value={ep.file_path ?? ""}
                            onChange={e => updateEpisodeField(season.number, ep.number, "file_path", e.target.value || null)}
                            placeholder="/mnt/series/show/s01e01.mkv"
                            className="h-7 text-xs font-mono"
                          />
                          <Input
                            value={ep.stream_url ?? ""}
                            onChange={e => updateEpisodeField(season.number, ep.number, "stream_url", e.target.value || null)}
                            placeholder="URL de stream (opcional)"
                            className="h-7 text-xs"
                          />
                        </div>

                        {/* Duration */}
                        <div className="w-16 shrink-0">
                          <Input
                            type="number"
                            value={ep.duration_min ?? ""}
                            onChange={e => updateEpisodeField(
                              season.number, ep.number, "duration_min",
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )}
                            placeholder="min"
                            className="h-7 text-xs text-center"
                            title="Duración en minutos"
                          />
                        </div>

                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-red-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => confirmRemoveEpisode(season.number, ep.number)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">
                    Sin episodios en esta temporada. Añade el primero abajo.
                  </p>
                )}

                {/* Add episode form */}
                <div className="rounded-lg border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-950/20 p-3 space-y-2">
                  <p className="text-[11px] font-medium text-violet-700 dark:text-violet-400">
                    + Agregar episodio {season.episodes.length > 0 ? `(Ep. ${Math.max(...season.episodes.map(e => e.number)) + 1})` : "(Ep. 1)"}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    <Input
                      placeholder="Título del episodio"
                      value={getNewEp(season.number).title}
                      onChange={e => setNewEpField(season.number, "title", e.target.value)}
                      className="h-7 text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="/mnt/series/show/s0Xe0Y.mkv"
                        value={getNewEp(season.number).file_path}
                        onChange={e => setNewEpField(season.number, "file_path", e.target.value)}
                        className="h-7 text-xs font-mono flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="min"
                        value={getNewEp(season.number).duration}
                        onChange={e => setNewEpField(season.number, "duration", e.target.value)}
                        className="h-7 text-xs w-16 text-center"
                        title="Duración en minutos"
                      />
                    </div>
                    <Input
                      placeholder="URL de stream (opcional)"
                      value={getNewEp(season.number).stream_url}
                      onChange={e => setNewEpField(season.number, "stream_url", e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                    onClick={() => addEpisode(season.number)}
                  >
                    <Plus className="size-3" /> Añadir episodio
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* ── Bottom save bar (sticky) if dirty ── */}
      {dirty && seasons.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 shadow-lg gap-2"
          >
            {saving
              ? <><Loader2 className="size-4 animate-spin" /> Guardando…</>
              : <><Save className="size-4" /> Guardar temporadas</>
            }
          </Button>
        </div>
      )}

      {/* ── Delete episode confirm ── */}
      <AlertDialog open={!!delEp} onOpenChange={v => { if (!v) setDelEp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar episodio?</AlertDialogTitle>
            <AlertDialogDescription>
              El episodio {delEp?.epNum} de la Temporada {delEp?.seasonNum} será eliminado de la lista.
              Aún tendrás que guardar para que el cambio sea permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeEpisode}
              className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
