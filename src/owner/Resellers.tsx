import { useEffect, useState, useMemo } from "react";
import { ownerSupabase, useOwnerAuth, useOwnerConfig, useCascadingImpersonation } from "@/hooks/useOwnerPanel";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Loader2,
  MoreHorizontal,
  Plus,
  Users,
  CreditCard,
  X,
  List,
  GitFork,
  ChevronRight,
  ChevronDown,
  Coins,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Reseller, ResellerRole, Line } from "@/types/owner-panel";

// ── Subtree utility ───────────────────────────────────────────────────────────

/** Returns the root node + all its descendants from a flat reseller list. */
function getSubtree(all: Reseller[], rootId: string): Reseller[] {
  const result: Reseller[] = [];
  const queue: string[] = [rootId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const node = all.find((r) => r.id === current);
    if (node) {
      result.push(node);
      all.filter((r) => r.parent_id === current).forEach((c) => queue.push(c.id));
    }
  }
  return result;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<ResellerRole, string> = {
  owner: "Dueño",
  reseller: "Reseller",
  sub: "Sub-reseller",
};
const ROLE_COLOR: Record<ResellerRole, string> = {
  owner: "bg-violet-100 text-violet-700",
  reseller: "bg-blue-100 text-blue-700",
  sub: "bg-zinc-100 text-zinc-600",
};

function RoleBadge({ role }: { role: ResellerRole }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLOR[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        status === "active"
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status === "active" ? "Activo" : "Suspendido"}
    </span>
  );
}

function CreditBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color =
    pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-400" : "bg-violet-500";
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-xs">
        <span className="font-medium text-foreground">{total - used}</span>
        <span className="text-muted-foreground">/ {total}</span>
        <span className="text-muted-foreground text-[10px]">({pct}%)</span>
      </div>
      <div className="h-1 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Form state ────────────────────────────────────────────────────────────────

interface CreateForm {
  name: string;
  email: string;
  password: string;
  credits: string;
  demos_limit: string;
  max_depth: string;
  parent_id: string;
}

const EMPTY_CREATE: CreateForm = {
  name: "", email: "", password: "",
  credits: "0", demos_limit: "50", max_depth: "", parent_id: "",
};

interface EditForm {
  name: string;
  email: string;
  demos_limit: string;
  max_depth: string;
}

// ── Credit Tree ───────────────────────────────────────────────────────────────

interface TreeNode {
  reseller: Reseller;
  children: TreeNode[];
  totalCredits: number;   // credits_total of entire subtree
  usedCredits: number;    // credits_used of entire subtree
  lineCount: number;      // lines count in entire subtree
}

function buildTree(
  all: Reseller[],
  lineCount: Record<string, number>,
  parentId: string | null
): TreeNode[] {
  return all
    .filter((r) => r.parent_id === parentId)
    .map((r) => {
      const children = buildTree(all, lineCount, r.id);
      const subtreeTotalCredits = children.reduce((s, c) => s + c.totalCredits, 0) + r.credits_total;
      const subtreeUsedCredits  = children.reduce((s, c) => s + c.usedCredits,  0) + r.credits_used;
      const subtreeLines        = children.reduce((s, c) => s + c.lineCount,     0) + (lineCount[r.id] ?? 0);
      return { reseller: r, children, totalCredits: subtreeTotalCredits, usedCredits: subtreeUsedCredits, lineCount: subtreeLines };
    });
}

function TreeNodeRow({
  node,
  depth,
  lineCount,
  onCredits,
  onCreateSub,
  onEdit,
  onToggleStatus,
  onDelete,
  onImpersonate,
  meId,
}: {
  node: TreeNode;
  depth: number;
  lineCount: Record<string, number>;
  onCredits: (r: Reseller) => void;
  onCreateSub: (r: Reseller) => void;
  onEdit: (r: Reseller) => void;
  onToggleStatus: (r: Reseller) => void;
  onDelete: (r: Reseller) => void;
  onImpersonate?: (r: Reseller) => void;
  meId?: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const r = node.reseller;
  const hasChildren = node.children.length > 0;
  const isMe = r.id === meId;

  const pct = r.credits_total > 0
    ? Math.min(100, Math.round((r.credits_used / r.credits_total) * 100))
    : 0;
  const barColor = pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-400" : "bg-violet-500";

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
          isMe ? "bg-violet-50 border border-violet-200" : "hover:bg-muted/40",
          r.status === "suspended" && "opacity-50"
        )}
        style={{ marginLeft: `${depth * 20}px` }}
      >
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn("size-5 shrink-0 flex items-center justify-center rounded text-muted-foreground", !hasChildren && "invisible")}
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("font-medium truncate", isMe && "text-violet-700")}>{r.name}</span>
            {isMe && <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-medium">Tú</span>}
            <span className={cn(
              "text-[10px] rounded-full px-1.5 py-0.5 font-medium",
              r.role === "owner"    ? "bg-violet-100 text-violet-700" :
              r.role === "reseller" ? "bg-blue-100 text-blue-700" :
                                       "bg-zinc-100 text-zinc-600"
            )}>
              {r.role === "owner" ? "Dueño" : r.role === "reseller" ? "Reseller" : "Sub"}
            </span>
            {r.status === "suspended" && (
              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Suspendido</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>
        </div>

        {/* Own credits bar */}
        <div className="hidden sm:flex flex-col items-end gap-0.5 min-w-[90px]">
          <div className="flex items-center gap-1 text-xs">
            <Coins className="size-3 text-violet-500" />
            <span className="font-medium">{r.credits_total - r.credits_used}</span>
            <span className="text-muted-foreground">/ {r.credits_total}</span>
          </div>
          <div className="h-1 w-20 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Subtree totals */}
        {hasChildren && (
          <div className="hidden md:flex flex-col items-end gap-0.5 min-w-[80px]">
            <span className="text-[10px] text-muted-foreground">subtree</span>
            <span className="text-xs font-medium text-foreground">
              {node.usedCredits} / {node.totalCredits} cr.
            </span>
          </div>
        )}

        {/* Lines */}
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
          <Users className="size-3" />{lineCount[r.id] ?? 0}
        </span>

        {/* Actions */}
        {!isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 shrink-0">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onImpersonate && (
                <>
                  <DropdownMenuItem onClick={() => onImpersonate(r)}>
                    <Eye className="size-3.5 mr-2" />Ver como este reseller
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onCredits(r)}>
                <CreditCard className="size-3.5 mr-2" />Asignar créditos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateSub(r)}>
                <Plus className="size-3.5 mr-2" />Crear sub-reseller
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(r)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(r)}>
                {r.status === "active" ? "Suspender" : "Reactivar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(r)}>
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Children */}
      {expanded && node.children.map((child) => (
        <TreeNodeRow
          key={child.reseller.id}
          node={child}
          depth={depth + 1}
          lineCount={lineCount}
          onCredits={onCredits}
          onCreateSub={onCreateSub}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onImpersonate={onImpersonate}
          meId={meId}
        />
      ))}
    </>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Resellers() {
  const { reseller: me } = useOwnerAuth();
  const config = useOwnerConfig();
  const { setImpersonatedReseller } = useCascadingImpersonation();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [lines, setLines] = useState<Pick<Line, "id" | "reseller_id">[]>([]);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | ResellerRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Sheets / Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [parentFor, setParentFor] = useState<Reseller | null>(null);
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Reseller | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", demos_limit: "", max_depth: "" });

  const [creditTarget, setCreditTarget] = useState<Reseller | null>(null);
  const [creditAmount, setCreditAmount] = useState("0");
  const [creditSaving, setCreditSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Reseller | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => { load(); }, [me?.id]);

  async function load() {
    setLoading(true);
    const [{ data: rData }, { data: lData }] = await Promise.all([
      ownerSupabase.from("resellers").select("*").order("created_at"),
      ownerSupabase.from("lines").select("id,reseller_id"),
    ]);

    const allResellers: Reseller[] = (rData ?? []).map((r) => ({
      ...r,
      credits_available: r.credits_total - r.credits_used,
    }));

    // App-level subtree filter (safety net for DBs without updated RLS).
    // Owners see everything; resellers/subs only see their own subtree.
    const visibleResellers =
      !me || me.role === "owner"
        ? allResellers
        : getSubtree(allResellers, me.id);

    // Filter lines to only those belonging to visible resellers
    const visibleIds = new Set(visibleResellers.map((r) => r.id));
    const visibleLines = (lData ?? []).filter(
      (l) => !l.reseller_id || visibleIds.has(l.reseller_id)
    );

    setResellers(visibleResellers);
    setLines(visibleLines);
    setLoading(false);
  }

  // Lines count per reseller
  const lineCount = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of lines) {
      if (l.reseller_id) map[l.reseller_id] = (map[l.reseller_id] ?? 0) + 1;
    }
    return map;
  }, [lines]);

  // Parent name lookup
  const parentName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of resellers) map[r.id] = r.name;
    return map;
  }, [resellers]);

  // Filtered list (exclude self / owner)
  const filtered = useMemo(() => {
    return resellers
      .filter((r) => r.id !== me?.id)
      .filter((r) =>
        search === "" ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase())
      )
      .filter((r) => roleFilter === "all" || r.role === roleFilter)
      .filter((r) => statusFilter === "all" || r.status === statusFilter);
  }, [resellers, me, search, roleFilter, statusFilter]);

  const hasFilters = search !== "" || roleFilter !== "all" || statusFilter !== "all";

  // Summary counts (excluding self)
  const others = resellers.filter((r) => r.id !== me?.id);
  const activeCount = others.filter((r) => r.status === "active").length;
  const suspendedCount = others.filter((r) => r.status === "suspended").length;
  const subCount = others.filter((r) => r.role === "sub").length;

  // ── Create ──────────────────────────────────────────────────────────────────

  function openCreate(parent?: Reseller) {
    setParentFor(parent ?? null);
    setCreateForm({ ...EMPTY_CREATE, parent_id: parent?.id ?? "" });
    setCreateOpen(true);
  }

  async function handleCreate() {
    if (!me) return;
    const credits = parseInt(createForm.credits) || 0;
    const available = me.credits_total - me.credits_used;
    if (credits > available) {
      toast.error(`No tienes suficientes créditos (disponibles: ${available})`);
      return;
    }
    if (parentFor && parentFor.max_depth !== null && parentFor.max_depth <= 0) {
      toast.error("Este reseller no puede crear sub-resellers (profundidad máxima alcanzada)");
      return;
    }

    // SuperAdmin-controlled ceiling from panel_config.network_depth.max_levels
    const globalMaxLevels = config.network_depth.max_levels;

    setSaving(true);
    try {
      const role: ResellerRole = createForm.parent_id ? "sub" : "reseller";

      let maxDepth: number | null;
      if (parentFor?.max_depth != null) {
        // Sub-reseller: inherit parent's depth - 1
        maxDepth = parentFor.max_depth - 1;
      } else if (createForm.max_depth !== "") {
        // Top-level reseller with manual input — cap with SuperAdmin ceiling
        const requested = parseInt(createForm.max_depth);
        const ceiling = globalMaxLevels != null ? globalMaxLevels - 1 : null;
        maxDepth = ceiling != null ? Math.min(requested, ceiling) : requested;
      } else {
        // Top-level reseller with no input — use SuperAdmin ceiling as default
        maxDepth = globalMaxLevels != null ? globalMaxLevels - 1 : null;
      }

      // Create the reseller via the License Manager edge function. It creates
      // the auth.users entry in the tenant's Supabase AND the resellers row.
      // A direct `insert` would skip Supabase Auth and the new user could
      // never log in.
      const LICENSE_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
      const LICENSE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";
      const tenantToken = (import.meta.env.VITE_TENANT_TOKEN as string | undefined) ?? "";
      const { data: { session } } = await ownerSupabase.auth.getSession();
      const callerJwt = session?.access_token ?? "";
      const res = await fetch(`${LICENSE_URL}/functions/v1/create-tenant-reseller`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": LICENSE_ANON,
          "Authorization": `Bearer ${LICENSE_ANON}`,
          "X-Caller-JWT": callerJwt,
        },
        body: JSON.stringify({
          tenant_token: tenantToken,
          parent_id: createForm.parent_id || null,
          role,
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
          credits_total: credits,
          demos_limit: parseInt(createForm.demos_limit) || 50,
          max_depth: maxDepth,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error ?? `HTTP ${res.status}`);
      }
      if (credits > 0) {
        await ownerSupabase.from("resellers").update({ credits_used: me.credits_used + credits }).eq("id", me.id);
      }
      toast.success("Reseller creado correctamente");
      setCreateOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creando reseller");
    } finally {
      setSaving(false);
    }
  }

  // ── Edit ────────────────────────────────────────────────────────────────────

  function openEdit(r: Reseller) {
    setEditTarget(r);
    setEditForm({
      name: r.name,
      email: r.email,
      demos_limit: String(r.demos_limit),
      max_depth: r.max_depth != null ? String(r.max_depth) : "",
    });
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { error } = await ownerSupabase.from("resellers").update({
        name: editForm.name,
        email: editForm.email,
        demos_limit: parseInt(editForm.demos_limit) || 50,
        max_depth: editForm.max_depth !== "" ? parseInt(editForm.max_depth) : null,
      }).eq("id", editTarget.id);
      if (error) throw error;
      toast.success("Reseller actualizado");
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error actualizando reseller");
    } finally {
      setSaving(false);
    }
  }

  // ── Assign credits ──────────────────────────────────────────────────────────

  function openCredits(r: Reseller) {
    setCreditTarget(r);
    setCreditAmount("0");
  }

  async function handleCredits() {
    if (!me || !creditTarget) return;
    const amount = parseInt(creditAmount) || 0;
    if (amount <= 0) { toast.error("Ingresa una cantidad mayor a 0"); return; }
    const available = me.credits_total - me.credits_used;
    if (amount > available) {
      toast.error(`No tienes suficientes créditos (disponibles: ${available})`);
      return;
    }
    setCreditSaving(true);
    try {
      await Promise.all([
        ownerSupabase.from("resellers").update({
          credits_total: creditTarget.credits_total + amount,
        }).eq("id", creditTarget.id),
        ownerSupabase.from("resellers").update({
          credits_used: me.credits_used + amount,
        }).eq("id", me.id),
      ]);
      toast.success(`${amount} créditos asignados a ${creditTarget.name}`);
      setCreditTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error asignando créditos");
    } finally {
      setCreditSaving(false);
    }
  }

  // ── Toggle status ────────────────────────────────────────────────────────────

  async function toggleStatus(r: Reseller) {
    const newStatus = r.status === "active" ? "suspended" : "active";
    await ownerSupabase.from("resellers").update({ status: newStatus }).eq("id", r.id);
    toast.success(newStatus === "active" ? "Reseller reactivado" : "Reseller suspendido");
    load();
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    const { error } = await ownerSupabase.from("resellers").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Error eliminando reseller");
    } else {
      toast.success(`Reseller "${deleteTarget.name}" eliminado`);
      setDeleteTarget(null);
      setDeleteConfirm(false);
      load();
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Resellers</h1>
          {!loading && (
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-medium text-foreground">{others.length}</span> total ·{" "}
              <span className="text-green-600 font-medium">{activeCount}</span> activos ·{" "}
              {suspendedCount > 0 && (
                <><span className="text-red-500 font-medium">{suspendedCount}</span> suspendidos · </>
              )}
              <span className="text-zinc-500">{subCount}</span> sub-resellers
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors",
                viewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
            >
              <List className="size-3.5" />Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={cn("flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-border",
                viewMode === "tree" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
            >
              <GitFork className="size-3.5" />Árbol
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => openCreate()}
            className="bg-violet-600 hover:bg-violet-700 gap-1.5"
          >
            <Plus className="size-4" /> Nuevo reseller
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Input
            placeholder="Buscar nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-52 text-sm pr-7"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Todos los roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="reseller">Reseller</SelectItem>
            <SelectItem value="sub">Sub-reseller</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="suspended">Suspendidos</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); }}
          >
            <X className="size-3 mr-1" /> Limpiar
          </Button>
        )}
      </div>

      {/* Tree view */}
      {viewMode === "tree" && (
        loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-6 animate-spin text-violet-600" />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Árbol de créditos — {resellers.length + 1} nodos
              </p>
              <span className="text-xs text-muted-foreground">
                Total asignado: <span className="font-semibold text-foreground">
                  {resellers.reduce((s, r) => s + r.credits_total, me?.credits_total ?? 0)} cr.
                </span>
              </span>
            </div>
            {/* Owner (me) as root */}
            {me && (() => {
              const meNode: TreeNode = {
                reseller: me,
                children: buildTree(resellers, lineCount, me.id),
                totalCredits: resellers.reduce((s, r) => s + r.credits_total, me.credits_total),
                usedCredits:  resellers.reduce((s, r) => s + r.credits_used,  me.credits_used),
                lineCount: resellers.reduce((s, r) => s + (lineCount[r.id] ?? 0), lineCount[me.id] ?? 0),
              };
              return (
                <TreeNodeRow
                  node={meNode}
                  depth={0}
                  lineCount={lineCount}
                  onCredits={openCredits}
                  onCreateSub={openCreate}
                  onEdit={openEdit}
                  onToggleStatus={toggleStatus}
                  onDelete={(r) => { setDeleteTarget(r); setDeleteConfirm(true); }}
                  onImpersonate={setImpersonatedReseller}
                  meId={me.id}
                />
              );
            })()}
          </div>
        )
      )}

      {/* List view (Table) */}
      {viewMode === "list" && loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : viewMode === "list" && filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "No hay resellers que coincidan con los filtros." : "No hay resellers aún. Crea el primero."}
          </p>
        </div>
      ) : viewMode === "list" && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Créditos</th>
                <th className="px-4 py-3 font-medium">Demos/mes</th>
                <th className="px-4 py-3 font-medium">Líneas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`hover:bg-muted/20 transition-colors ${
                    r.status === "suspended" ? "opacity-60" : ""
                  }`}
                >
                  {/* Name + email */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                    {r.parent_id && parentName[r.parent_id] && (
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                        bajo {parentName[r.parent_id]}
                      </p>
                    )}
                  </td>
                  {/* Role */}
                  <td className="px-4 py-3">
                    <RoleBadge role={r.role} />
                  </td>
                  {/* Credits */}
                  <td className="px-4 py-3">
                    <CreditBar used={r.credits_used} total={r.credits_total} />
                  </td>
                  {/* Demos */}
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.demos_this_month}
                    <span className="text-xs"> / {r.demos_limit}</span>
                  </td>
                  {/* Lines */}
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" />
                      {lineCount[r.id] ?? 0}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
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
                        <DropdownMenuItem onClick={() => setImpersonatedReseller(r)}>
                          <Eye className="size-3.5 mr-2" /> Ver como este reseller
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openCredits(r)}>
                          <CreditCard className="size-3.5 mr-2" /> Asignar créditos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openCreate(r)}>
                          <Plus className="size-3.5 mr-2" /> Crear sub-reseller
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEdit(r)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(r)}>
                          {r.status === "active" ? "Suspender" : "Reactivar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => { setDeleteTarget(r); setDeleteConfirm(true); }}
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
          {hasFilters && (
            <p className="px-4 py-2 text-xs text-muted-foreground border-t border-border">
              Mostrando {filtered.length} de {others.length} resellers
            </p>
          )}
        </div>
      )}

      {/* ── Create Sheet ── */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {parentFor ? `Sub-reseller de ${parentFor.name}` : "Nuevo reseller"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {[
              { id: "c-name", label: "Nombre", key: "name" as const, placeholder: "Ej: Juan García" },
              { id: "c-email", label: "Email", key: "email" as const, placeholder: "juan@email.com", type: "email" },
              { id: "c-pass", label: "Contraseña", key: "password" as const, placeholder: "••••••••", type: "password" },
            ].map(({ id, label, key, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type ?? "text"}
                  placeholder={placeholder}
                  value={createForm[key]}
                  onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="c-credits">Créditos a asignar</Label>
              <Input
                id="c-credits"
                type="number"
                min={0}
                value={createForm.credits}
                onChange={(e) => setCreateForm((f) => ({ ...f, credits: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Disponibles: <span className="font-medium text-foreground">{me ? me.credits_total - me.credits_used : 0}</span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-demos">Límite demos/mes</Label>
              <Input
                id="c-demos"
                type="number"
                min={0}
                value={createForm.demos_limit}
                onChange={(e) => setCreateForm((f) => ({ ...f, demos_limit: e.target.value }))}
              />
            </div>
            {!parentFor && (
              <div className="space-y-1.5">
                <Label htmlFor="c-depth">Profundidad máxima (vacío = ilimitado)</Label>
                <Input
                  id="c-depth"
                  type="number"
                  min={0}
                  placeholder="Ilimitado"
                  value={createForm.max_depth}
                  onChange={(e) => setCreateForm((f) => ({ ...f, max_depth: e.target.value }))}
                />
              </div>
            )}
            <Button
              onClick={handleCreate}
              disabled={saving || !createForm.name || !createForm.email || !createForm.password}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Crear reseller
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ── */}
      <Sheet open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar reseller</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Nombre</Label>
              <Input
                id="e-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-email">Email</Label>
              <Input
                id="e-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-demos">Límite demos/mes</Label>
              <Input
                id="e-demos"
                type="number"
                min={0}
                value={editForm.demos_limit}
                onChange={(e) => setEditForm((f) => ({ ...f, demos_limit: e.target.value }))}
              />
            </div>
            {editTarget?.role !== "sub" && (
              <div className="space-y-1.5">
                <Label htmlFor="e-depth">Profundidad máxima (vacío = ilimitado)</Label>
                <Input
                  id="e-depth"
                  type="number"
                  min={0}
                  placeholder="Ilimitado"
                  value={editForm.max_depth}
                  onChange={(e) => setEditForm((f) => ({ ...f, max_depth: e.target.value }))}
                />
              </div>
            )}
            <Button
              onClick={handleEdit}
              disabled={saving || !editForm.name || !editForm.email}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Assign credits Dialog ── */}
      <Dialog open={!!creditTarget} onOpenChange={(o) => { if (!o) setCreditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Asignar créditos a <span className="font-medium text-foreground">{creditTarget?.name}</span>
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cr-amount">Cantidad de créditos</Label>
              <Input
                id="cr-amount"
                type="number"
                min={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tus créditos disponibles: <span className="font-medium text-foreground">{me ? me.credits_total - me.credits_used : 0}</span>
              </p>
            </div>
            {creditTarget && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p>Créditos actuales: <span className="font-medium">{creditTarget.credits_total - creditTarget.credits_used}</span> / {creditTarget.credits_total}</p>
                <p>Después de asignar: <span className="font-medium">{creditTarget.credits_total - creditTarget.credits_used + (parseInt(creditAmount) || 0)}</span> / {creditTarget.credits_total + (parseInt(creditAmount) || 0)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditTarget(null)}>Cancelar</Button>
            <Button
              onClick={handleCredits}
              disabled={creditSaving || (parseInt(creditAmount) || 0) <= 0}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {creditSaving && <Loader2 className="size-4 animate-spin" />}
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete AlertDialog ── */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reseller?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar a <span className="font-medium text-foreground">{deleteTarget?.name}</span>.
              Sus líneas y sub-resellers quedarán sin asignar. Esta acción no se puede deshacer.
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
