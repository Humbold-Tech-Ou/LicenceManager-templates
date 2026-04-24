import { Link } from "react-router-dom";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PlanBadge from "@/components/tenants/PlanBadge";
import type { Tenant } from "@/types/tenant";

interface Props {
  loading: boolean;
  list: Tenant[];
  onRenew: (id: string) => void;
}

export default function ExpiringTable({ loading, list, onRenew }: Props) {
  const now = new Date();
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Vencimientos próximos (7 días)</h2>
        <Link to="/tenants?filter=expiring7" className="text-xs text-primary hover:underline">Ver todos</Link>
      </div>
      {loading ? <Skeleton className="h-32" /> : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Todo en orden por ahora 🎉</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</th>
                <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Plan</th>
                <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Días</th>
                <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Acción</th>
              </tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const days = differenceInDays(new Date(t.expires_at), now);
                return (
                  <tr key={t.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5">
                      <Link to={`/tenants/${t.id}`} className="text-foreground hover:text-primary hover:underline truncate max-w-[180px] inline-block">
                        {t.owner_email}
                      </Link>
                    </td>
                    <td className="py-2.5"><PlanBadge plan={t.plan} /></td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${days < 3 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                        {days}d
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => onRenew(t.id)}>+30d</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
