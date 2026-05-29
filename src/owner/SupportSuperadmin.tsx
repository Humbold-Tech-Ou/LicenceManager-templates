import { useEffect, useMemo, useRef, useState } from "react";
import { useOwnerAuth } from "@/hooks/useOwnerPanel";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Send, MessageSquare } from "lucide-react";
import { formatDistanceToNowStrict, format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LICENSE_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
const LICENSE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";

type Status = "open" | "answered" | "closed";
type Priority = "low" | "normal" | "high";

interface Ticket {
  id: string;
  subject: string;
  status: Status;
  priority: Priority;
  last_message_by: string | null;
  last_message_at: string;
  has_unread: boolean;
  created_at: string;
}
interface Reply {
  id: string;
  sender_type: "tenant" | "admin";
  sender_name: string;
  body: string;
  created_at: string;
}

const STATUS_LABEL: Record<Status, string> = {
  open: "Abierto",
  answered: "Respondido",
  closed: "Cerrado",
};
const STATUS_COLOR: Record<Status, string> = {
  open: "bg-yellow-100 text-yellow-700",
  answered: "bg-green-100 text-green-700",
  closed: "bg-zinc-100 text-zinc-500",
};
const PRIORITY_LABEL: Record<Priority, string> = { low: "Baja", normal: "Normal", high: "Alta" };

export default function SupportSuperadmin() {
  const { reseller } = useOwnerAuth();
  const tenantToken = (import.meta.env.VITE_TENANT_TOKEN as string | undefined) ?? "";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("normal");
  const [creating, setCreating] = useState(false);

  const headers = useMemo(
    () => ({
      apikey: LICENSE_ANON,
      Authorization: `Bearer ${LICENSE_ANON}`,
      "X-Tenant-Token": tenantToken,
    }),
    [tenantToken],
  );

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/support-ticket-list`, { headers });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setTickets(j.tickets ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }
  async function loadThread(id: string) {
    setRepliesLoading(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/support-ticket-thread?ticket_id=${id}`, { headers });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setReplies(j.replies ?? []);
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setRepliesLoading(false);
    }
  }
  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/support-ticket-reply`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: selected.id,
          body: replyText.trim(),
          sender_name: reseller?.name ?? "Owner",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setReplyText("");
      await loadThread(selected.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSending(false);
    }
  }
  async function createTicket() {
    if (!newSubject.trim() || !newBody.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${LICENSE_URL}/functions/v1/support-ticket-create`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          body: newBody.trim(),
          priority: newPriority,
          sender_name: reseller?.name ?? "Owner",
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      toast.success("Ticket enviado al SuperAdmin");
      setCreateOpen(false);
      setNewSubject(""); setNewBody(""); setNewPriority("normal");
      loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => { if (tenantToken) loadList(); }, [tenantToken]);
  useEffect(() => { if (selected) loadThread(selected.id); else setReplies([]); }, [selected?.id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies]);

  if (!tenantToken) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Esta sección no está disponible en este panel.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <div className="w-72 border-r border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <MessageSquare className="size-4 text-violet-600" />
          <h1 className="text-sm font-semibold">Soporte SuperAdmin</h1>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="ml-auto h-7 px-2 gap-1 bg-violet-600 hover:bg-violet-700">
            <Plus className="size-3" /> Nuevo
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-violet-600" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-10">
              No tienes solicitudes. <br />Crea una con "Nuevo".
            </p>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted/40 transition",
                  selected?.id === t.id && "bg-violet-50 border-l-2 border-violet-600",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{t.subject}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {formatDistanceToNowStrict(new Date(t.last_message_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[t.status]}`}>
                    {STATUS_LABEL[t.status]}
                  </span>
                  {t.has_unread && <span className="ml-auto size-2 rounded-full bg-red-500" />}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="size-12 opacity-30 mb-3" />
            <p className="text-sm">Selecciona o crea un ticket</p>
          </div>
        ) : (
          <>
            <div className="border-b px-4 py-3">
              <h2 className="text-base font-semibold">{selected.subject}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Prioridad: {PRIORITY_LABEL[selected.priority]}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {repliesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-violet-600" />
                </div>
              ) : (
                replies.map((r) => {
                  const isMe = r.sender_type === "tenant";
                  return (
                    <div key={r.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                        isMe ? "bg-violet-600 text-white" : "bg-zinc-100 text-foreground",
                      )}>
                        <p className={cn("text-[10px] font-medium mb-0.5", isMe ? "text-violet-200" : "text-muted-foreground")}>
                          {r.sender_name}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{r.body}</p>
                        <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-violet-200" : "text-muted-foreground")}
                           title={format(new Date(r.created_at), "PPpp", { locale: es })}>
                          {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {selected.status !== "closed" && (
              <div className="border-t px-4 py-3 flex items-end gap-2">
                <Textarea
                  className="flex-1 resize-none min-h-[40px] max-h-[120px]"
                  placeholder="Escribe una respuesta…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="bg-violet-600 hover:bg-violet-700 rounded-xl shrink-0"
                  disabled={!replyText.trim() || sending}
                  onClick={sendReply}
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo ticket al SuperAdmin</DialogTitle>
            <DialogDescription>
              Reporta un problema o solicita ayuda. El SuperAdmin recibirá tu mensaje y responderá desde aquí.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-subject">Asunto</Label>
              <Input
                id="s-subject"
                placeholder="Breve descripción"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <Select value={newPriority} onValueChange={(v) => setNewPriority(v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-body">Mensaje</Label>
              <Textarea
                id="s-body"
                placeholder="Describe tu problema o solicitud…"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={5}
                maxLength={5000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              disabled={creating || !newSubject.trim() || !newBody.trim()}
              onClick={createTicket}
            >
              {creating && <Loader2 className="size-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
