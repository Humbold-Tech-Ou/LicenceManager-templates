import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEventConfig, TenantEventType, EVENT_CONFIG } from "@/lib/events";
import Topbar from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string;
  created_at: string | null;
  created_by: string | null;
  event_type: string;
  metadata: Record<string, unknown> | null;
  tenant_id: string;
  tenants: {
    id: string;
    owner_email: string;
    owner_name: string | null;
  } | null;
}

const PAGE_SIZE = 20;

const DATE_RANGES = [
  { value: "all",   label: "Todo el tiempo" },
  { value: "today", label: "Hoy" },
  { value: "7d",    label: "Últimos 7 días" },
  { value: "30d",   label: "Últimos 30 días" },
];

// ── Event type badge ──────────────────────────────────────────────────────────

const DOT_TO_BADGE: Record<string, string> = {
  "bg-success":          "bg-green-100 text-green-700 border-green-200",
  "bg-warning":          "bg-yellow-100 text-yellow-700 border-yellow-200",
  "bg-destructive":      "bg-red-100 text-red-600 border-red-200",
  "bg-info":             "bg-blue-100 text-blue-700 border-blue-200",
  "bg-primary":          "bg-violet-100 text-violet-700 border-violet-200",
  "bg-muted-foreground": "bg-muted text-muted-foreground border-border",
};

function EventBadge({ type }: { type: string }) {
  const cfg = getEventConfig(type);
  const cls = DOT_TO_BADGE[cfg.dotColor] ?? DOT_TO_BADGE["bg-muted-foreground"];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", cls)}>
      {cfg.label}
    </span>
  );
}

// ── Metadata viewer ───────────────────────────────────────────────────────────

function MetaValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground italic">null</span>;
  if (typeof value === "boolean") return <span className={value ? "text-green-600" : "text-red-500"}>{String(value)}</span>;
  if (typeof value === "object") return (
    <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
      {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
        <div key={k} className="flex flex-wrap gap-1.5 text-xs">
          <span className="font-medium text-foreground">{k}:</span>
          <MetaValue value={v} />
        </div>
      ))}
    </div>
  );
  return <span className="text-foreground font-mono break-all">{String(value)}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Audit() {
  const navigate = useNavigate();

  // Data
  const [events, setEvents]     = useState<AuditEvent[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]           = useState("");
  const [typeFilter, setTypeFilter]   = useState("all");
  const [dateRange, setDateRange]     = useState("all");
  const [page, setPage]               = useState(0);

  // Detail dialog
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("license_events")
        .select("*, tenants(id, owner_email, owner_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (typeFilter !== "all") {
        query = query.eq("event_type", typeFilter);
      }

      if (dateRange !== "all") {
        const days = dateRange === "today" ? 0 : dateRange === "7d" ? 7 : 30;
        const from = startOfDay(subDays(new Date(), days)).toISOString();
        query = query.gte("created_at", from);
      }

      // Search is post-filtered (Supabase doesn't support cross-table ilike easily)
      const { data, count, error } = await query;

      if (error) throw error;

      let rows = (data ?? []) as AuditEvent[];

      if (search.trim()) {
        const q = search.toLowerCase();
        rows = rows.filter((e) =>
          e.tenants?.owner_email?.toLowerCase().includes(q) ||
          e.tenants?.owner_name?.toLowerCase().includes(q) ||
          e.created_by?.toLowerCase().includes(q)
        );
      }

      setEvents(rows);
      setTotal(count ?? 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cargar eventos");
    }
    setLoading(false);
  }, [page, typeFilter, dateRange, search]);

  useEffect(() => { setPage(0); }, [typeFilter, dateRange, search]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Topbar title="Auditoría" breadcrumb="Historial global de eventos" />
      <div className="p-4 sm:p-6 space-y-4 animate-fade-in">

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-end gap-2 sm:gap-3">
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Buscar</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Tenant, email o admin..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-52">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tipo de evento</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(Object.keys(EVENT_CONFIG) as TenantEventType[]).map((type) => (
                  <SelectItem key={type} value={type}>{EVENT_CONFIG[type].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-full sm:w-44">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Período</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {loading ? "Cargando…" : (
              <>
                <span className="font-semibold text-foreground">{total.toLocaleString()}</span> eventos en total
              </>
            )}
          </span>
          {(typeFilter !== "all" || dateRange !== "all" || search) && (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => { setTypeFilter("all"); setDateRange("all"); setSearch(""); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-muted/50">
                {["Fecha", "Tipo", "Tenant", "Creado por", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    No se encontraron eventos con los filtros aplicados.
                  </td>
                </tr>
              ) : events.map((ev) => {
                const date = ev.created_at ? new Date(ev.created_at) : null;
                return (
                  <tr key={ev.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {date ? (
                        <>
                          <div className="text-foreground text-xs font-medium">
                            {format(date, "d MMM yyyy", { locale: es })}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(date, { addSuffix: true, locale: es })}
                          </div>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <EventBadge type={ev.event_type} />
                    </td>
                    <td className="px-4 py-2.5">
                      {ev.tenants ? (
                        <button
                          type="button"
                          className="text-left hover:underline focus:outline-none focus-visible:underline"
                          onClick={() => navigate(`/tenants/${ev.tenants!.id}`)}
                        >
                          <div className="text-foreground font-medium text-xs">{ev.tenants.owner_email}</div>
                          {ev.tenants.owner_name && (
                            <div className="text-[11px] text-muted-foreground">{ev.tenants.owner_name}</div>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{ev.tenant_id.slice(0, 8)}…</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                        {ev.created_by ?? "Sistema"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelected(ev)}
                      >
                        <Eye className="size-3.5" />
                        Ver detalles
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página <span className="font-semibold text-foreground">{page + 1}</span> de{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Detail dialog ── */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected && <EventBadge type={selected.event_type} />}
              <span className="text-sm font-normal text-muted-foreground">
                {selected?.created_at
                  ? format(new Date(selected.created_at), "d MMM yyyy · HH:mm", { locale: es })
                  : ""}
              </span>
            </DialogTitle>
            <DialogDescription>
              {selected?.tenants?.owner_email ?? selected?.tenant_id}
              {selected?.created_by && ` · Por ${selected.created_by}`}
            </DialogDescription>
          </DialogHeader>

          {selected?.metadata && Object.keys(selected.metadata).length > 0 ? (
            <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              {Object.entries(selected.metadata).map(([key, val]) => (
                <div key={key} className="text-xs">
                  <span className="font-semibold text-foreground">{key}:</span>{" "}
                  <MetaValue value={val} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic mt-2">Sin metadata adicional.</p>
          )}

          {selected?.tenants && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => { setSelected(null); navigate(`/tenants/${selected.tenants!.id}`); }}
            >
              Ver perfil del tenant →
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
