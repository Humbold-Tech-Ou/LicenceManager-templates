import MetricCard from "@/components/dashboard/MetricCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

interface Props {
  loading: boolean;
  total: number;
  active: number;
  suspended: number;
  expired: number;
}

export default function MetricsGrid({ loading, total, active, suspended, expired }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <MetricCard label="Tenants totales" value={total} borderColor="border-t-4 border-t-primary" icon={<Users className="h-4 w-4 text-primary" />} />
      <MetricCard label="Activos" value={active} borderColor="border-t-4 border-t-success" icon={<CheckCircle2 className="h-4 w-4 text-success" />} />
      <MetricCard label="Suspendidos" value={suspended} borderColor="border-t-4 border-t-warning" icon={<AlertTriangle className="h-4 w-4 text-warning" />} />
      <MetricCard label="Expirados" value={expired} borderColor="border-t-4 border-t-destructive" icon={<XCircle className="h-4 w-4 text-destructive" />} />
    </div>
  );
}
