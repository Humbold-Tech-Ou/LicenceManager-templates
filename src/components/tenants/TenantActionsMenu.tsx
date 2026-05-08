import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Copy, RefreshCw, CreditCard, Coins, Pause, Play, History, Trash2, Mail } from "lucide-react";
import { copyToClipboard } from "@/lib/helpers";
import type { Tenant } from "@/types/tenant";

export type TenantDialogType = "renew" | "suspend" | "plan" | "credits" | "delete" | "reactivate";

interface Props {
  tenant: Tenant;
  onAction: (type: TenantDialogType, tenant: Tenant) => void;
  resendCooldownUntil?: number; // timestamp ms when cooldown expires
  onResendWelcome: () => void;
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TenantActionsMenu({ tenant, onAction, resendCooldownUntil, onResendWelcome }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick countdown only while menu is open and cooldown is active
  useEffect(() => {
    if (!open) { clearInterval(intervalRef.current!); return; }
    const tick = () => {
      const left = (resendCooldownUntil ?? 0) - Date.now();
      setRemaining(left > 0 ? left : 0);
      if (left <= 0) clearInterval(intervalRef.current!);
    };
    tick();
    intervalRef.current = setInterval(tick, 500);
    return () => clearInterval(intervalRef.current!);
  }, [open, resendCooldownUntil]);

  const isCooling = remaining > 0;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={() => { navigate(`/tenants/${tenant.id}`); setOpen(false); }}>
          <Eye className="mr-2 h-4 w-4" />Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { copyToClipboard(tenant.tenant_token); setOpen(false); }}>
          <Copy className="mr-2 h-4 w-4" />Copiar token
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={isCooling}
          onClick={() => { if (!isCooling) { onResendWelcome(); setOpen(false); } }}
          className={isCooling ? "cursor-not-allowed opacity-60" : ""}
        >
          <Mail className="mr-2 h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">
            {isCooling
              ? <span>Reenviar correo <span className="font-mono text-xs text-muted-foreground">(volver en {formatRemaining(remaining)})</span></span>
              : "Reenviar correo de bienvenida"}
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onAction("renew", tenant); setOpen(false); }}>
          <RefreshCw className="mr-2 h-4 w-4" />Renovar licencia
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onAction("plan", tenant); setOpen(false); }}>
          <CreditCard className="mr-2 h-4 w-4" />Cambiar plan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { onAction("credits", tenant); setOpen(false); }}>
          <Coins className="mr-2 h-4 w-4" />Ajustar créditos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {tenant.status === "active" ? (
          <DropdownMenuItem onClick={() => { onAction("suspend", tenant); setOpen(false); }} className="text-destructive focus:text-destructive">
            <Pause className="mr-2 h-4 w-4" />Suspender
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => { onAction("reactivate", tenant); setOpen(false); }}>
            <Play className="mr-2 h-4 w-4" />Reactivar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => { navigate(`/tenants/${tenant.id}#events`); setOpen(false); }}>
          <History className="mr-2 h-4 w-4" />Ver eventos
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onAction("delete", tenant); setOpen(false); }} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />Eliminar tenant
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
