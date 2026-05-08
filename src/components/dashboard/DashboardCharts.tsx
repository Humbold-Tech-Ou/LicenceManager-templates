import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_CHART_COLORS } from "@/lib/dashboard-metrics";

interface Props {
  loading: boolean;
  chartData: { name: string; count: number }[];
  planData: { name: string; plan: string; count: number }[];
}

export default function DashboardCharts({ loading, chartData, planData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Tenants creados por mes</h2>
        {loading ? <Skeleton className="h-56" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Tenants" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Distribución por plan</h2>
        {loading ? <Skeleton className="h-56" /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Tenants">
                {planData.map((d) => <Cell key={d.plan} fill={PLAN_CHART_COLORS[d.plan]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
