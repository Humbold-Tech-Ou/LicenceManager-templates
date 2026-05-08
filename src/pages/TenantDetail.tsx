import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { Tenant, LicenseEvent } from "@/types/tenant";
import Topbar from "@/components/layout/Topbar";
import StatusBadge from "@/components/tenants/StatusBadge";

import { OnboardingSteps } from "@/components/tenants/OnboardingProgress";
import EventTimeline from "@/components/tenants/EventTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { copyToClipboard, invokeEdgeFunction } from "@/lib/helpers";
import { Copy, ExternalLink, CalendarIcon, ChevronDown, Mail, Link2, RotateCcw, Check, Loader2, Coins } from "lucide-react";
import AdjustCreditsDialog from "@/components/tenants/AdjustCreditsDialog";
import { useTenantActions } from "@/hooks/useTenantActions";
import { formatDistanceToNow } from "date-fns";
import { getEventConfig } from "@/lib/events";

type PublishedVersion = { id: string; version_number: string };

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [events, setEvents] = useState<LicenseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishedVersions, setPublishedVersions] = useState<PublishedVersion[]>([]);
  const [editPanelVersionId, setEditPanelVersionId] = useState<string>("");

  // Edit state
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editExpires, setEditExpires] = useState<Date | undefined>();
  const [editNotes, setEditNotes] = useState("");

  // Notes autosave
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved">("idle");
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesInitial = useRef<string | null>(null);

  // Action loading
  const [resending, setResending] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Credits dialog
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);

  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    const [{ data: t }, { data: e }, { data: versions }] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", id).single(),
      supabase.from("license_events").select("*").eq("tenant_id", id).order("created_at", { ascending: false }),
      supabase.from("panel_versions" as any).select("id, version_number").eq("status", "published").order("created_at", { ascending: false }),
    ]);
    if (t) {
      setTenant(t);
      setEditEmail(t.owner_email);
      setEditName(t.owner_name ?? "");
      setEditPlan(t.plan);
      setEditExpires(new Date(t.expires_at));
      setEditNotes(t.notes ?? "");
      setEditPanelVersionId((t as any).panel_version_id ?? "");
      notesInitial.current = t.notes ?? "";
    }
    setEvents(e ?? []);
    setPublishedVersions((versions as unknown as PublishedVersion[]) ?? []);
    setLoading(false);
  };

  const tenantActions = useTenantActions(fetchData);

  useEffect(() => { fetchData(); }, [id]);

  // Notes autosave (debounced 800ms)
  useEffect(() => {
    if (!tenant || notesInitial.current === null) return;
    if (editNotes === notesInitial.current) return;

    setNotesStatus("saving");
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("tenants")
        .update({ notes: editNotes || null })
        .eq("id", tenant.id);
      if (error) {
        toast.error("Error al guardar notas");
        setNotesStatus("idle");
        return;
      }
      notesInitial.current = editNotes;
      setNotesStatus("saved");
      setTimeout(() => setNotesStatus("idle"), 1500);
    }, 800);

    return () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    };
  }, [editNotes, tenant]);

  const handleSaveClick = () => {
    if (tenant && editPlan !== tenant.plan) {
      setConfirmDialog("plan_change");
    } else {
      saveChanges();
    }
  };

  const saveChanges = async () => {
    if (!tenant) return;
    setSaving(true);
    const changes: any = {};
    const meta: any = {};
    if (editEmail !== tenant.owner_email) { changes.owner_email = editEmail; meta.email = editEmail; }
    if (editName !== (tenant.owner_name ?? "")) { changes.owner_name = editName || null; }
    if (editPlan !== tenant.plan) { changes.plan = editPlan; meta.plan_from = tenant.plan; meta.plan_to = editPlan; }
    const expiresChanged = editExpires && editExpires.toISOString() !== tenant.expires_at;
    if (expiresChanged) { changes.expires_at = editExpires!.toISOString(); }
    const currentVersionId = (tenant as any).panel_version_id ?? "";
    if (editPanelVersionId !== currentVersionId) {
      changes.panel_version_id = editPanelVersionId || null;
    }
    // notes are handled by autosave

    if (Object.keys(changes).length === 0) { setSaving(false); return; }

    const { error } = await supabase.from("tenants").update(changes).eq("id", tenant.id);
    if (error) { toast.error("Error al guardar"); setSaving(false); return; }

    const eventType = meta.plan_to ? (meta.plan_to > meta.plan_from! ? "upgraded" : "downgraded") : "renewed";
    await supabase.from("license_events").insert([{ tenant_id: tenant.id, event_type: eventType, metadata: meta }]);
    toast.success("Cambios guardados");

    // If expires_at changed, fire the renewal email (best-effort)
    if (expiresChanged) {
      try {
        await supabase.functions.invoke("send-renewal-email", { body: { tenant_id: tenant.id } });
        toast.success("Correo de renovación enviado");
      } catch (err) {
        console.error("send-renewal-email failed", err);
        toast.error("No se pudo enviar el correo de renovación");
      }
    }

    fetchData();
    setSaving(false);
  };

  const handleStatusAction = async (action: string) => {
    if (!tenant) return;
    let eventType = "";
    if (action === "suspend") {
      await supabase.from("tenants").update({ status: "suspended" } as any).eq("id", tenant.id);
      eventType = "suspended";
    } else if (action === "reactivate") {
      await supabase.from("tenants").update({ status: "active" } as any).eq("id", tenant.id);
      eventType = "reactivated";
    } else if (action === "renew30" || action === "renew90" || action === "renew365") {
      const days = action === "renew30" ? 30 : action === "renew90" ? 90 : 365;
      const d = new Date(); d.setDate(d.getDate() + days);
      await supabase.from("tenants").update({ expires_at: d.toISOString(), status: "active" } as any).eq("id", tenant.id);
      await supabase.from("license_events").insert([{ tenant_id: tenant.id, event_type: "renewed", metadata: { days } }]);
      toast.success(`Renovado ${days} días`);
      fetchData();
      setConfirmDialog(null);
      return;
    }
    await supabase.from("license_events").insert([{ tenant_id: tenant.id, event_type: eventType }]);
    toast.success(action === "suspend" ? "Suspendido" : "Reactivado");
    fetchData();
    setConfirmDialog(null);
  };

  const handleResendEmail = async () => {
    if (!tenant) return;
    setResending(true);
    try {
      await invokeEdgeFunction("send-welcome-email", { tenant_id: tenant.id, base_url: window.location.origin });
      await supabase.from("license_events").insert([{ tenant_id: tenant.id, event_type: "welcome_email_sent" }]);
      toast.success(`Email reenviado a ${tenant.owner_email}`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al reenviar email");
    } finally {
      setResending(false);
    }
  };

  const handleCopyOnboardingLink = () => {
    if (!tenant) return;
    const url = `${window.location.origin}/onboarding/${tenant.id}`;
    copyToClipboard(url);
    toast.success("Link de onboarding copiado");
  };

  const handleResetOnboarding = async () => {
    if (!tenant) return;
    setResetting(true);
    const { error } = await supabase
      .from("tenants")
      .update({ onboarding_step: 0, onboarding_done: false } as any)
      .eq("id", tenant.id);
    if (error) {
      toast.error("Error al resetear onboarding");
      setResetting(false);
      setConfirmDialog(null);
      return;
    }
    await supabase.from("license_events").insert([{ tenant_id: tenant.id, event_type: "onboarding_reset" }]);
    toast.success("Onboarding reseteado");
    fetchData();
    setResetting(false);
    setConfirmDialog(null);
  };

  if (loading) return (
    <>
      <Topbar title="Detalle del tenant" breadcrumb="Tenants → Cargando..." />
      <div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
    </>
  );

  if (!tenant) return (
    <>
      <Topbar title="Tenant no encontrado" />
      <div className="flex flex-col items-center justify-center p-12"><p className="text-muted-foreground">Este tenant no existe.</p><Button variant="outline" className="mt-4" onClick={() => navigate("/tenants")}>Volver</Button></div>
    </>
  );

  return (
    <>
      <Topbar title={tenant.owner_email} breadcrumb={`Tenants → ${tenant.owner_name ?? tenant.owner_email}`} />
      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Info card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Información general</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Nombre</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Plan</Label>
                  <Select value={editPlan} onValueChange={setEditPlan}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Versión del Panel</Label>
                  <Select
                    value={editPanelVersionId || "none"}
                    onValueChange={(v) => setEditPanelVersionId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin versión asignada" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin versión asignada</SelectItem>
                      {publishedVersions.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.version_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={tenant.status} />
                    {tenant.status === "active" && <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => setConfirmDialog("suspend")}>Suspender</Button>}
                    {tenant.status === "suspended" && <Button size="sm" variant="outline" className="text-success border-success/20 hover:bg-success/5" onClick={() => handleStatusAction("reactivate")}>Reactivar</Button>}
                    {tenant.status === "expired" && <Button size="sm" variant="outline" onClick={() => handleStatusAction("renew30")}>Renovar</Button>}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Expira</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !editExpires && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editExpires ? format(editExpires, "PPP", { locale: es }) : "Seleccionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={editExpires} onSelect={(d) => d && setEditExpires(d)} className="pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Notas internas</Label>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    {notesStatus === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</>)}
                    {notesStatus === "saved" && (<><Check className="h-3 w-3 text-success" /> Guardado</>)}
                  </span>
                </div>
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Notas privadas sobre este tenant (autosave activado)…"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-xs text-muted-foreground">Token:</Label>
                <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-foreground break-all max-w-full">{tenant.tenant_token}</code>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(tenant.tenant_token)}><Copy className="h-3.5 w-3.5" /></Button>
              </div>

              {/* Credits display */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Coins className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Créditos asignados</p>
                    <p className="text-2xl font-bold text-foreground leading-tight">{tenant.credits_assigned}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setCreditsDialogOpen(true)}
                >
                  <Coins className="size-3.5" />
                  Gestionar
                </Button>
              </div>

              <Button onClick={handleSaveClick} disabled={saving} className="w-full sm:w-auto">{saving ? "Guardando..." : "Guardar cambios"}</Button>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Renovar <ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleStatusAction("renew30")}>+30 días</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusAction("renew90")}>+90 días</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusAction("renew365")}>+365 días</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Cambiar plan <ChevronDown className="ml-1 h-3 w-3" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  {(["basic", "pro", "enterprise"] as const).filter((p) => p !== tenant.plan).map((p) => (
                    <DropdownMenuItem key={p} onClick={() => { setEditPlan(p); }}>{p.charAt(0).toUpperCase() + p.slice(1)}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Supabase */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Supabase</h2>
              {tenant.supabase_connected ? (
                <div className="space-y-1.5 text-sm">
                  <span className="inline-flex items-center rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-medium border border-success/20">Conectado</span>
                  <p className="text-muted-foreground">Proyecto: {tenant.supabase_project_name} ({tenant.supabase_region})</p>
                  {tenant.supabase_project_id && (
                    <a href={`https://supabase.com/dashboard/project/${tenant.supabase_project_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      Abrir en Supabase <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ) : <p className="text-sm text-muted-foreground">No conectado aún</p>}
            </div>

            {/* Deploy */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Deploy</h2>
              {!tenant.deploy_connected ? (
                <p className="text-sm text-muted-foreground">Sin plataforma configurada</p>
              ) : tenant.deploy_url ? (
                <div className="space-y-1.5 text-sm">
                  <span className="inline-flex items-center rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-medium border border-success/20">Activo</span>
                  <p className="text-muted-foreground">Plataforma: {tenant.deploy_platform}</p>
                  <p className="text-muted-foreground">Proyecto: {tenant.deploy_project_name}</p>
                  <a href={tenant.deploy_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {tenant.deploy_url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <div className="space-y-1.5 text-sm">
                  <span className="inline-flex items-center rounded-full bg-warning/10 text-warning px-2 py-0.5 text-xs font-medium border border-warning/20">Desplegando...</span>
                  <Button size="sm" variant="outline" className="mt-2">Verificar estado</Button>
                </div>
              )}
            </div>

            {/* Onboarding */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Onboarding</h2>
                  {tenant.onboarding_done && (
                    <span className="inline-flex items-center rounded-full bg-success/10 border border-success/20 text-success px-2 py-0.5 text-xs font-medium">Completado</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/onboarding/${tenant.id}`)}
                >
                  {tenant.onboarding_done ? "Ver wizard" : "Iniciar wizard →"}
                </Button>
              </div>
              <OnboardingSteps step={tenant.onboarding_step ?? 0} done={!!tenant.onboarding_done} />

              {/* Onboarding actions */}
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="gap-1.5"
                >
                  {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Reenviar welcome email
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyOnboardingLink}
                  className="gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Copiar link de onboarding
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDialog("reset_onboarding")}
                  disabled={resetting}
                  className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/5"
                >
                  {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Resetear onboarding
                </Button>
              </div>
            </div>

            {/* Credits history */}
            {(() => {
              const creditEvents = events.filter((e) =>
                ["credits_added", "credits_removed", "credits_adjusted"].includes(e.event_type)
              );
              return (
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Coins className="size-4 text-primary" />
                    Historial de Créditos
                  </h2>
                  {creditEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin movimientos de créditos registrados.</p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {creditEvents.map((ev) => {
                        const meta    = (ev.metadata ?? {}) as Record<string, unknown>;
                        const delta   = meta.delta   as number | undefined;
                        const from    = meta.from    as number | undefined;
                        const to      = meta.to      as number | undefined;
                        const concept = meta.concept as string | undefined;
                        const cfg     = getEventConfig(ev.event_type);
                        const isAdd   = ev.event_type === "credits_added";
                        const isSub   = ev.event_type === "credits_removed";
                        return (
                          <li key={ev.id} className="py-2.5 flex items-start justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                                {concept && (
                                  <span className="text-xs text-muted-foreground italic truncate max-w-[180px]">"{concept}"</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                                {from !== undefined && to !== undefined && <span>{from} → {to}</span>}
                                {ev.created_by && <span>· {ev.created_by}</span>}
                                {ev.created_at && (
                                  <span>· {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: es })}</span>
                                )}
                              </div>
                            </div>
                            {delta !== undefined && (
                              <span className={cn(
                                "shrink-0 text-sm font-bold",
                                isAdd ? "text-green-600" : isSub ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {isAdd ? "+" : isSub ? "−" : "="}{delta}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6">
              <h2 className="mb-4 text-sm font-semibold text-foreground">Historial de eventos</h2>
              <EventTimeline events={events} />
            </div>
          </div>
        </div>
      </div>

      {/* Confirm plan change */}
      <AlertDialog open={confirmDialog === "plan_change"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cambiará el plan de <strong>{tenant?.plan}</strong> a <strong>{editPlan}</strong>. Esta acción queda registrada en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditPlan(tenant!.plan)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDialog(null); saveChanges(); }}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm suspend */}
      <AlertDialog open={confirmDialog === "suspend"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Suspender tenant?</AlertDialogTitle>
            <AlertDialogDescription>El tenant no podrá acceder a su panel hasta que sea reactivado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleStatusAction("suspend")}>Suspender</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm reset onboarding */}
      <AlertDialog open={confirmDialog === "reset_onboarding"} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Resetear onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              El tenant tendrá que completar el wizard de activación desde cero (Supabase + Deploy). Esta acción queda registrada en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetOnboarding} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Resetear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credits dialog */}
      {tenant && (
        <AdjustCreditsDialog
          open={creditsDialogOpen}
          onOpenChange={setCreditsDialogOpen}
          currentCredits={tenant.credits_assigned}
          busy={tenantActions.busy}
          onConfirm={(delta, mode, concept) =>
            tenantActions.adjustCredits(tenant.id, delta, mode, tenant.credits_assigned, concept)
          }
        />
      )}

    </>
  );
}
