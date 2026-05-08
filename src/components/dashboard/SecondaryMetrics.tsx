import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CalendarDays, Rocket, DollarSign, ArrowUpRight } from "lucide-react";
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
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const cardBase =
    "block group h-full rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-[0_1px_3px_0_rgb(0_0_0_/_0.04)]";
  const labelCls = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
  const valueCls = "mt-3 text-[32px] font-semibold leading-none tracking-tight text-foreground tabular-nums";
  const iconWrap =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground";

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Link to="/tenants?filter=expiring7" className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={labelCls}>Vencen ≤ 7 días</p>
            <p className={valueCls}>{expiring7}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Ver lista <ArrowUpRight className="h-3 w-3" />
            </p>
          </div>
          <div className={iconWrap}>
            <Clock className="h-4 w-4" />
          </div>
        </div>
      </Link>

      <Link to="/tenants?filter=expiring30" className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={labelCls}>Vencen ≤ 30 días</p>
            <p className={valueCls}>{expiring30}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Ver lista <ArrowUpRight className="h-3 w-3" />
            </p>
          </div>
          <div className={iconWrap}>
            <CalendarDays className="h-4 w-4" />
          </div>
        </div>
      </Link>

      <Link to="/tenants?onboarding=pending" className={cardBase}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={labelCls}>Onboarding pendiente</p>
            <p className={valueCls}>{onboardingPending}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground/70 transition-all"
                  style={{ width: `${onboardingPct}%` }}
                />
              </div>
              <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                {onboardingPct}%
              </span>
            </div>
          </div>
          <div className={iconWrap}>
            <Rocket className="h-4 w-4" />
          </div>
        </div>
      </Link>

      <div className={cardBase.replace("group ", "")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={labelCls}>MRR estimado</p>
            <p className={valueCls}>{formatUSD(mrr)}</p>
            <p className="mt-2 text-[11px] font-medium text-muted-foreground">
              {active} activos · ARR {formatUSD(arr)}
            </p>
          </div>
          <div className={iconWrap}>
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
