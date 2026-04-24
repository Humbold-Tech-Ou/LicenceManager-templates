import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarDays, Rocket, DollarSign, ArrowRight } from "lucide-react";
import { formatUSD } from "@/lib/pricing";

interface Props {
  loading: boolean;
  expiring7: number;
  expiring30: number;
  onboardingPending: number;
  onboardingPct: number;
  active: number;
  mrr: number;
  arr: number;
}

export default function SecondaryMetrics({
  loading, expiring7, expiring30, onboardingPending, onboardingPct, active, mrr, arr,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link to="/tenants?filter=expiring7" className="block group">
        <div className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-warning group-hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Vencen ≤ 7 días</p>
            <Clock className="h-4 w-4 text-warning" />
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">{expiring7}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Ver lista <ArrowRight className="h-3 w-3" />
          </p>
        </div>
      </Link>
      <Link to="/tenants?filter=expiring30" className="block group">
        <div className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary group-hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Vencen ≤ 30 días</p>
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">{expiring30}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Ver lista <ArrowRight className="h-3 w-3" />
          </p>
        </div>
      </Link>
      <Link to="/tenants?onboarding=pending" className="block group">
        <div className="rounded-xl border border-border bg-card p-5 transition-all group-hover:border-primary group-hover:shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Onboarding pendiente</p>
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">{onboardingPending}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${onboardingPct}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground">{onboardingPct}%</span>
          </div>
        </div>
      </Link>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">MRR estimado</p>
          <DollarSign className="h-4 w-4 text-success" />
        </div>
        <p className="mt-2 text-[28px] font-semibold leading-none text-foreground">{formatUSD(mrr)}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">{active} activos · ARR {formatUSD(arr)}</p>
      </div>
    </div>
  );
}
