import type { ElementType } from "react";

interface Props {
  label: string;
  value: number | string;
  icon: ElementType;
  color: string;
}

export default function OwnerStatCard({ label, value, icon: Icon, color }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}
