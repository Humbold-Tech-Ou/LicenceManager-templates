import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { getEventConfig } from "@/lib/events";
import type { EventWithTenant } from "@/hooks/useDashboardData";

interface Props {
  loading: boolean;
  events: EventWithTenant[];
}

export default function RecentEvents({ loading, events }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Eventos recientes</h2>
      {loading ? <Skeleton className="h-32" /> : events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin eventos aún</p>
      ) : (
        <ul className="divide-y divide-border">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{getEventConfig(ev.event_type).label}</p>
                {ev.tenant ? (
                  <Link to={`/tenants/${ev.tenant.id}`} className="text-xs text-muted-foreground hover:text-primary hover:underline truncate block max-w-full">
                    {ev.tenant.owner_email}
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground">Tenant eliminado</p>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatDistanceToNow(new Date(ev.created_at!), { addSuffix: true, locale: es })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
