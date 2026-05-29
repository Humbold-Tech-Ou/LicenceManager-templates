import { useEffect, useState, useRef, useMemo } from "react";
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
import { Loader2, MessageSquare, Plus, Send, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  Ticket,
  TicketReply,
  TicketStatus,
  TicketPriority,
} from "@/types/owner-panel";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Abierto",
  answered: "Respondido",
  closed: "Cerrado",
};

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: "bg-yellow-100 text-yellow-700",
  answered: "bg-green-100 text-green-700",
  closed: "bg-zinc-100 text-zinc-500",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: "Baja",
  normal: "Normal",
  high: "Alta",
};

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low: "bg-zinc-100 text-zinc-500",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-red-100 text-red-700",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[priority]}`}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mes`;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "open" | "answered" | "closed";

const TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "open", label: "Abiertos" },
  { value: "answered", label: "Respondidos" },
  { value: "closed", label: "Cerrados" },
];

// ── Main Component ───────────────────────────────────────────────────────────

export default function Tickets() {
  const { reseller, loading: authLoading } = useOwnerAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Create form state
  const [newSubject, setNewSubject] = useState("");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normal");
  const [newMessage, setNewMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const repliesEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch tickets ────────────────────────────────────────────────────────

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await ownerSupabase
      .from("tickets")
      .select("*, reseller:resellers(id,name,role)")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Error al cargar tickets");
      console.error(error);
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading) fetchTickets();
  }, [authLoading]);

  // ── Fetch replies when ticket selected ───────────────────────────────────

  async function fetchReplies(ticketId: string) {
    setRepliesLoading(true);
    // Use SECURITY DEFINER RPC because the resellers RLS only allows reading
    // your own subtree — replies from an ancestor (e.g. the owner answering
    // a reseller) would otherwise come back with sender = null.
    const { data, error } = await ownerSupabase
      .rpc("get_ticket_replies", { _ticket_id: ticketId });

    if (error) {
      toast.error("Error al cargar respuestas");
      console.error(error);
    } else {
      // Reshape flat rows to match the existing TicketReply shape (sender as nested object)
      const reshaped = (data ?? []).map((r: any) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        sender_id: r.sender_id,
        body: r.body,
        created_at: r.created_at,
        sender: r.sender_id
          ? { id: r.sender_id, name: r.sender_name ?? "Desconocido", role: r.sender_role ?? "" }
          : null,
      }));
      setReplies(reshaped);
    }
    setRepliesLoading(false);
  }

  useEffect(() => {
    if (selectedTicket) {
      fetchReplies(selectedTicket.id);
    } else {
      setReplies([]);
    }
  }, [selectedTicket?.id]);

  // Scroll to bottom when replies change
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  // ── Filtered tickets ─────────────────────────────────────────────────────

  const filteredTickets = useMemo(() => {
    if (activeTab === "all") return tickets;
    return tickets.filter((t) => t.status === activeTab);
  }, [tickets, activeTab]);

  // ── Send reply ───────────────────────────────────────────────────────────

  async function handleSendReply() {
    if (!replyText.trim() || !selectedTicket || !reseller) return;
    setSending(true);

    const { error: replyError } = await ownerSupabase
      .from("ticket_replies")
      .insert({
        ticket_id: selectedTicket.id,
        sender_id: reseller.id,
        body: replyText.trim(),
      });

    if (replyError) {
      toast.error("Error al enviar respuesta");
      setSending(false);
      return;
    }

    // Update ticket status & updated_at
    const updatePayload: Partial<Ticket> = {
      updated_at: new Date().toISOString(),
    };
    if (reseller.role === "owner") {
      updatePayload.status = "answered";
    }

    await ownerSupabase
      .from("tickets")
      .update(updatePayload)
      .eq("id", selectedTicket.id);

    setReplyText("");
    setSending(false);
    toast.success("Respuesta enviada");

    // Refresh
    fetchReplies(selectedTicket.id);
    fetchTickets();
  }

  // ── Change status ────────────────────────────────────────────────────────

  async function handleChangeStatus(status: TicketStatus) {
    if (!selectedTicket) return;
    const { error } = await ownerSupabase
      .from("tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", selectedTicket.id);

    if (error) {
      toast.error("Error al cambiar estado");
    } else {
      toast.success(`Ticket marcado como ${STATUS_LABEL[status].toLowerCase()}`);
      setSelectedTicket({ ...selectedTicket, status });
      fetchTickets();
    }
  }

  // ── Create ticket ────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!newSubject.trim() || !newMessage.trim() || !reseller) return;
    setCreating(true);

    const { data: ticketData, error: ticketError } = await ownerSupabase
      .from("tickets")
      .insert({
        reseller_id: reseller.id,
        subject: newSubject.trim(),
        priority: newPriority,
        status: "open" as TicketStatus,
      })
      .select()
      .single();

    if (ticketError || !ticketData) {
      toast.error("Error al crear ticket");
      setCreating(false);
      return;
    }

    // Insert initial message
    await ownerSupabase.from("ticket_replies").insert({
      ticket_id: ticketData.id,
      sender_id: reseller.id,
      body: newMessage.trim(),
    });

    toast.success("Ticket creado");
    setCreateOpen(false);
    setNewSubject("");
    setNewPriority("normal");
    setNewMessage("");
    setCreating(false);
    fetchTickets();
  }

  // ── Select ticket ────────────────────────────────────────────────────────

  function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setReplyText("");
    // On mobile, open the detail sheet
    if (window.innerWidth < 768) {
      setMobileDetailOpen(true);
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────────

  function renderTicketList() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
      );
    }

    if (filteredTickets.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-2 opacity-40" />
          <p className="text-sm">No hay tickets</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-border">
        {filteredTickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => handleSelectTicket(ticket)}
            className={cn(
              "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
              selectedTicket?.id === ticket.id && "bg-violet-50 border-l-2 border-violet-600"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {ticket.subject}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {ticket.reseller?.name || "Sin reseller"}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
                {relativeTime(ticket.updated_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
          </button>
        ))}
      </div>
    );
  }

  function renderTicketDetail(ticket: Ticket) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b px-4 py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground leading-tight">
              {ticket.subject}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0">
                  Estado <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleChangeStatus("open")}>
                  Abierto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleChangeStatus("answered")}>
                  Respondido
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCloseConfirmOpen(true)}
                  className="text-red-600"
                >
                  Cerrar ticket
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className="text-xs text-muted-foreground ml-auto">
              {ticket.reseller?.name}
            </span>
          </div>
        </div>

        {/* Replies thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {repliesLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            </div>
          ) : replies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Sin mensajes aun
            </p>
          ) : (
            replies.map((reply) => {
              const isOwner = reply.sender?.role === "owner";
              return (
                <div
                  key={reply.id}
                  className={cn(
                    "flex",
                    isOwner ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                      isOwner
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-100 text-foreground"
                    )}
                  >
                    <p className={cn(
                      "text-[10px] font-medium mb-0.5",
                      isOwner ? "text-violet-200" : "text-muted-foreground"
                    )}>
                      {reply.sender?.name || "Desconocido"}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{reply.body}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-1 text-right",
                        isOwner ? "text-violet-200" : "text-muted-foreground"
                      )}
                    >
                      {relativeTime(reply.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={repliesEndRef} />
        </div>

        {/* Reply input */}
        {ticket.status !== "closed" && (
          <div className="border-t px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 min-h-[40px] max-h-[120px]"
                placeholder="Escribe una respuesta..."
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
              />
              <Button
                size="icon"
                className="bg-violet-600 hover:bg-violet-700 rounded-xl shrink-0"
                disabled={!replyText.trim() || sending}
                onClick={handleSendReply}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-violet-600" />
          <h1 className="text-lg font-semibold">Tickets de Soporte</h1>
        </div>
        <Button
          size="sm"
          className="bg-violet-600 hover:bg-violet-700"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuevo Ticket
        </Button>
      </div>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: ticket list */}
        <div className="w-full md:w-[380px] md:border-r flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b px-2 py-1 gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  activeTab === tab.value
                    ? "bg-violet-100 text-violet-700"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto">
            {renderTicketList()}
          </div>
        </div>

        {/* Right panel: ticket detail (desktop) */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden">
          {selectedTicket ? (
            renderTicketDetail(selectedTicket)
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-12 w-12 opacity-30 mb-3" />
              <p className="text-sm">Selecciona un ticket para ver los detalles</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Detalle de ticket</SheetTitle>
          </SheetHeader>
          {selectedTicket && renderTicketDetail(selectedTicket)}
        </SheetContent>
      </Sheet>

      {/* Create ticket sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Nuevo Ticket</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Asunto</Label>
              <Input
                id="ticket-subject"
                placeholder="Describe brevemente el problema"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={newPriority}
                onValueChange={(v) => setNewPriority(v as TicketPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticket-message">Mensaje</Label>
              <textarea
                id="ticket-message"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 min-h-[120px]"
                placeholder="Describe tu problema en detalle..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-violet-600 hover:bg-violet-700"
              disabled={!newSubject.trim() || !newMessage.trim() || creating}
              onClick={handleCreate}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Crear Ticket
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Close ticket confirmation */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez cerrado, no se podran enviar mas respuestas. Puedes reabrirlo
              despues si es necesario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                handleChangeStatus("closed");
                setCloseConfirmOpen(false);
              }}
            >
              Cerrar ticket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
