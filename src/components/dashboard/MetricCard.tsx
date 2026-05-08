import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
}

export default function MetricCard({ label, value, icon, hint }: Props) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-[32px] font-semibold leading-none tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {hint && (
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">{hint}</p>
          )}
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
