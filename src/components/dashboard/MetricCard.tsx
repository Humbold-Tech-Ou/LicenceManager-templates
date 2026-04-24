import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  borderColor: string;
  icon?: ReactNode;
}

export default function MetricCard({ label, value, borderColor, icon }: Props) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">{value}</p>
    </div>
  );
}
