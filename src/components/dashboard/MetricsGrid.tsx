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
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <MetricCard
        label="Tenants totales"
        value={total}
        icon={<Users className="h-4 w-4" />}
        hint="Cuenta global"
      />
      <MetricCard
        label="Activos"
        value={active}
        icon={<CheckCircle2 className="h-4 w-4" />}
        hint={`${activePct}% del total`}
      />
      <MetricCard
        label="Suspendidos"
        value={suspended}
        icon={<AlertTriangle className="h-4 w-4" />}
        hint="Pago pendiente"
      />
      <MetricCard
        label="Expirados"
        value={expired}
        icon={<XCircle className="h-4 w-4" />}
        hint="Licencia vencida"
      />
    </div>
  );
}
