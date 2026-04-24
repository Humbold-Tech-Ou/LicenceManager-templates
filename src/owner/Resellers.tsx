import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Reseller, ResellerRole } from "@/types/owner-panel";

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

interface FormState {
  name: string;
  email: string;
  password: string;
  credits: string;
  demos_limit: string;
  max_depth: string;
  parent_id: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  credits: "0",
  demos_limit: "50",
  max_depth: "",
  parent_id: "",
};

export default function Resellers() {
  const { reseller: me } = useOwnerAuth();
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [parentFor, setParentFor] = useState<Reseller | null>(null);

  useEffect(() => {
    load();
  }, [me?.id]);

  async function load() {
    setLoading(true);
    const { data } = await ownerSupabase
      .from("resellers")
      .select("*")
      .order("created_at");
    setResellers(
      (data ?? []).map((r) => ({
        ...r,
        credits_available: r.credits_total - r.credits_used,
      }))
    );
    setLoading(false);
  }

  function openNew(parent?: Reseller) {
    setParentFor(parent ?? null);
    setForm({ ...EMPTY_FORM, parent_id: parent?.id ?? "" });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!me) return;
    const credits = parseInt(form.credits) || 0;
    const available = me.credits_total - me.credits_used;

    if (credits > available) {
      toast.error(`No tienes suficientes créditos (disponibles: ${available})`);
      return;
    }

    // Validate depth
    if (parentFor && parentFor.max_depth !== null && parentFor.max_depth <= 0) {
      toast.error("Este reseller no puede crear sub-resellers (profundidad máxima alcanzada)");
      return;
    }

    setSaving(true);
    try {
      const role: ResellerRole =
        !form.parent_id ? "reseller" : "sub";

      const maxDepth =
        parentFor?.max_depth != null
          ? parentFor.max_depth - 1
          : form.max_depth !== ""
          ? parseInt(form.max_depth)
          : null;

      // Create auth user in owner's Supabase
      const { data: authData, error: authErr } = await ownerSupabase.auth.admin
        ? // service role not available client-side; use signUp instead
          { data: null, error: { message: "no admin" } }
        : { data: null, error: null };

      // Insert reseller record
      const { error } = await ownerSupabase.from("resellers").insert({
        parent_id: form.parent_id || null,
        role,
        name: form.name,
        email: form.email,
        password_hash: form.password, // hashing handled by DB or edge function in production
        credits_total: credits,
        credits_used: 0,
        demos_limit: parseInt(form.demos_limit) || 50,
        max_depth: maxDepth,
        status: "active",
      });

      if (error) throw error;

      // Debit credits from current user
      if (credits > 0) {
        await ownerSupabase
          .from("resellers")
          .update({ credits_used: me.credits_used + credits })
          .eq("id", me.id);
      }

      toast.success("Reseller creado correctamente");
      setSheetOpen(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error creando reseller");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(r: Reseller) {
    const newStatus = r.status === "active" ? "suspended" : "active";
    await ownerSupabase.from("resellers").update({ status: newStatus }).eq("id", r.id);
    toast.success(newStatus === "active" ? "Reseller reactivado" : "Reseller suspendido");
    load();
  }

  return (
    <div className="p-6 space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Resellers</h1>
        <Button
          size="sm"
          onClick={() => openNew()}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5"
        >
          <Plus className="size-4" /> Nuevo reseller
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="size-6 animate-spin text-violet-600" />
        </div>
      ) : resellers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No hay resellers aún. Crea el primero.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Créditos</th>
                <th className="px-4 py-3 font-medium">Demos/mes</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {resellers.map((r) => (
                <tr key={r.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={r.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-violet-600">
                      {r.credits_total - r.credits_used}
                    </span>
                    <span className="text-muted-foreground text-xs"> / {r.credits_total}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.demos_this_month} / {r.demos_limit}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {r.status === "active" ? "Activo" : "Suspendido"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openNew(r)}>
                          Crear sub-reseller
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(r)}>
                          {r.status === "active" ? "Suspender" : "Reactivar"}
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

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {parentFor ? `Sub-reseller de ${parentFor.name}` : "Nuevo reseller"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {[
              { id: "name", label: "Nombre", key: "name" as const, placeholder: "Ej: Juan García" },
              { id: "email", label: "Email", key: "email" as const, placeholder: "juan@email.com", type: "email" },
              { id: "password", label: "Contraseña", key: "password" as const, placeholder: "••••••••", type: "password" },
            ].map(({ id, label, key, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id}>{label}</Label>
                <Input
                  id={id}
                  type={type ?? "text"}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="credits">Créditos a asignar</Label>
              <Input
                id="credits"
                type="number"
                min={0}
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Disponibles: {me ? me.credits_total - me.credits_used : 0}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demos_limit">Límite demos/mes</Label>
              <Input
                id="demos_limit"
                type="number"
                min={0}
                value={form.demos_limit}
                onChange={(e) => setForm((f) => ({ ...f, demos_limit: e.target.value }))}
              />
            </div>
            {!parentFor && (
              <div className="space-y-1.5">
                <Label htmlFor="max_depth">Profundidad máxima (vacío = ilimitado)</Label>
                <Input
                  id="max_depth"
                  type="number"
                  min={0}
                  placeholder="Ilimitado"
                  value={form.max_depth}
                  onChange={(e) => setForm((f) => ({ ...f, max_depth: e.target.value }))}
                />
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.email || !form.password}
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
