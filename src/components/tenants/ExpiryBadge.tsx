import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  expiresAt: string;
  className?: string;
}

export default function ExpiryBadge({ expiresAt, className }: Props) {
  const days = differenceInDays(new Date(expiresAt), new Date());

  let config: { label: string; className: string; icon: typeof Clock };
  if (days < 0) {
    config = {
      label: `Vencido hace ${Math.abs(days)}d`,
      className: "bg-muted text-muted-foreground border-border",
      icon: XCircle,
    };
  } else if (days <= 7) {
    config = {
      label: `Vence en ${days}d`,
      className: "bg-destructive/10 text-destructive border-destructive/20 animate-pulse",
      icon: AlertCircle,
    };
  } else if (days <= 30) {
    config = {
      label: `Vence en ${days}d`,
      className: "bg-warning/10 text-warning border-warning/20",
      icon: Clock,
    };
  } else {
    config = {
      label: `${days}d restantes`,
      className: "bg-success/10 text-success border-success/20",
      icon: CheckCircle2,
    };
  }

  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}
