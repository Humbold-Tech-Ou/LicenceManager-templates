import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, Plus, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const LICENSE_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
const LICENSE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";

type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";

interface CreditRequest {
  id: string;
  requested_amount: number;
  approved_amount: number | null;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

const STATUS_META: Record<RequestStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  pending:   { label: "Pendiente",  cls: "bg-amber-100 text-amber-700",  icon: <Clock className="size-3" /> },
  approved:  { label: "Aprobada",   cls: "bg-green-100 text-green-700",  icon: <CheckCircle2 className="size-3" /> },
  rejected:  { label: "Rechazada",  cls: "bg-red-100 text-red-700",      icon: <XCircle className="size-3" /> },
  cancelled: { label: "Cancelada",  cls: "bg-zinc-100 text-zinc-500",    icon: <XCircle className="size-3" /> },
};

export default function CreditRequestCard() {
  const tenantToken = (import.meta.env.VITE_TENANT_TOKEN as string | undefined) ?? "";

  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadRequests() {
    if (!tenantToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/list-credit-requests`, {
        headers: {
          apikey: LICENSE_ANON,
          "X-Tenant-Token": tenantToken,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error cargando solicitudes");
      setRequests(json.requests ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error cargando solicitudes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRequests(); }, []);

  async function handleSubmit() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/tenant-request-credits`, {
        method: "POST",
        headers: {
          apikey: LICENSE_ANON,
          "X-Tenant-Token": tenantToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requested_amount: Math.floor(n),
          message: message.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error enviando solicitud");
      toast.success("Solicitud enviada al SuperAdmin");
      setOpen(false);
      setAmount("");
      setMessage("");
      loadRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error enviando solicitud");
    } finally {
      setSubmitting(false);
    }
  }

  if (!tenantToken) return null;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const recent = requests.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
            <CreditCard className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Recargar créditos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Solicita una recarga al SuperAdmin. Se acreditarán al ser aprobadas.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          disabled={pendingCount > 0}
          className="bg-violet-600 hover:bg-violet-700 gap-1.5 shrink-0"
        >
          <Plus className="size-3.5" />
          Solicitar
        </Button>
      </div>

      {pendingCount > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
          Tienes una solicitud pendiente. Espera a que sea resuelta antes de enviar otra.
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : recent.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Aún no has enviado solicitudes.
        </p>
      ) : (
        <div className="space-y-1.5">
          {recent.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${meta.cls}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                  <span className="font-mono font-semibold text-foreground shrink-0">
                    {r.status === "approved" && r.approved_amount != null
                      ? r.approved_amount.toLocaleString()
                      : r.requested_amount.toLocaleString()}
                  </span>
                  {r.admin_note && (
                    <span className="text-muted-foreground truncate" title={r.admin_note}>
                      “{r.admin_note}”
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0">
                  {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true, locale: es })}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar recarga de créditos</DialogTitle>
            <DialogDescription>
              El SuperAdmin recibirá tu solicitud y podrá aprobarla con el monto que decida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cr-amount">Monto solicitado</Label>
              <Input
                id="cr-amount"
                type="number"
                min={1}
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cr-msg">Mensaje (opcional)</Label>
              <Textarea
                id="cr-msg"
                placeholder="Necesito créditos para ampliar mi red de resellers…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !amount}
              className="bg-violet-600 hover:bg-violet-700 gap-1.5"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
