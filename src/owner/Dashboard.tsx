import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
import { Loader2, TrendingUp, Tv2, Clock, FlaskConical } from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { Line } from "@/types/owner-panel";
import { toast } from "sonner";
import OwnerStatCard from "@/components/owner/OwnerStatCard";

interface Stat {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

interface ChartPoint {
  day: string;
  líneas: number;
}


export default function OwnerDashboard() {
  const { reseller } = useOwnerAuth();
  const [stats, setStats] = useState<Stat[]>([]);
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reseller) return;
    loadAll();
  }, [reseller?.id]);

  async function loadAll() {
    setLoading(true);
    try {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 3600 * 1000).toISOString();
      const today = now.toISOString().split("T")[0];

      const [linesRes, expRes] = await Promise.all([
        ownerSupabase.from("lines").select("id, status, is_demo, created_at, expires_at, reseller_id"),
        ownerSupabase
          .from("lines")
          .select("*, package:packages(id,name,duration_hours)")
          .lte("expires_at", in48h)
          .gte("expires_at", now.toISOString())
          .eq("status", "active")
          .order("expires_at"),
      ]);

      const allLines: Line[] = linesRes.data ?? [];
      const active = allLines.filter((l) => l.status === "active").length;
      const expiredToday = allLines.filter(
        (l) => l.expires_at?.startsWith(today) && l.status === "expired"
      ).length;
      const demos = allLines.filter(
        (l) =>
          l.is_demo &&
          l.created_at &&
          l.created_at.startsWith(now.toISOString().slice(0, 7))
      ).length;

      setStats([
        {
          label: "Créditos disponibles",
          value: (reseller!.credits_total - reseller!.credits_used).toLocaleString(),
          icon: TrendingUp,
          color: "bg-violet-100 text-violet-600",
        },
        {
          label: "Líneas activas",
          value: active,
          icon: Tv2,
          color: "bg-green-100 text-green-600",
        },
        {
          label: "Expiradas hoy",
          value: expiredToday,
          icon: Clock,
          color: "bg-orange-100 text-orange-600",
        },
        {
          label: "Demos este mes",
          value: demos,
          icon: FlaskConical,
          color: "bg-blue-100 text-blue-600",
        },
      ]);

      // Chart: lines created last 7 days
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        const key = d.toISOString().split("T")[0];
        return {
          day: format(d, "EEE", { locale: es }),
          key,
          líneas: 0,
        };
      });
      for (const line of allLines) {
        if (!line.created_at) continue;
        const dayKey = line.created_at.split("T")[0];
        const found = days.find((d) => d.key === dayKey);
        if (found) found.líneas++;
      }
      setChart(days.map(({ day, líneas }) => ({ day, líneas })));
      setExpiringSoon((expRes.data ?? []) as Line[]);
    } catch {
      toast.error("Error cargando el dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <OwnerStatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Líneas creadas — últimos 7 días
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
              cursor={{ fill: "#f5f3ff" }}
            />
            <Bar dataKey="líneas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Expiran en 48 h ({expiringSoon.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Username</th>
                  <th className="pb-2 font-medium">Paquete</th>
                  <th className="pb-2 font-medium">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expiringSoon.map((line) => (
                  <tr key={line.id}>
                    <td className="py-2 font-mono text-xs">{line.username}</td>
                    <td className="py-2">{line.package?.name ?? "—"}</td>
                    <td className="py-2 text-orange-600 text-xs">
                      {format(new Date(line.expires_at), "d MMM HH:mm", { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
