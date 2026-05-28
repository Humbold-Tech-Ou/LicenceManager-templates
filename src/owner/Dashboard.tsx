import { useEffect, useState } from "react";
import { ownerSupabase, useOwnerAuth } from "@/hooks/useOwnerPanel";
import { Loader2, Tv2, Clock, FlaskConical, Users, Wifi, Server } from "lucide-react";
import { format, formatDistanceToNowStrict, subDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { Line } from "@/types/owner-panel";
import { toast } from "sonner";
import CreditRequestCard from "./CreditRequestCard";

interface ChartPoint { day: string; líneas: number }

// ── Stat card ──────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  violet: { bg: "bg-violet-100", text: "text-violet-600" },
  green:  { bg: "bg-green-100",  text: "text-green-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  blue:   { bg: "bg-blue-100",   text: "text-blue-600" },
};

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  color: keyof typeof COLOR_MAP;
}) {
  const { bg, text } = COLOR_MAP[color];
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className={`size-9 rounded-lg ${bg} ${text} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { reseller } = useOwnerAuth();
  const [chart, setChart] = useState<ChartPoint[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<Line[]>([]);
  const [activeLines, setActiveLines] = useState(0);
  const [expiredToday, setExpiredToday] = useState(0);
  const [resellerCount, setResellerCount] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [serverCount, setServerCount] = useState(0);
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

      const [linesRes, expRes, resRes, connRes, srvRes] = await Promise.all([
        ownerSupabase.from("lines").select("id, status, is_demo, created_at, expires_at"),
        ownerSupabase
          .from("lines")
          .select("id, username, expires_at, package:packages(id,name), reseller:resellers(id,name)")
          .lte("expires_at", in48h)
          .gte("expires_at", now.toISOString())
          .eq("status", "active")
          .order("expires_at"),
        ownerSupabase.from("resellers").select("id").neq("id", reseller!.id),
        ownerSupabase.from("active_connections").select("id"),
        ownerSupabase.from("servers").select("id").eq("status", "active"),
      ]);

      const allLines: Line[] = linesRes.data ?? [];
      setActiveLines(allLines.filter((l) => l.status === "active").length);
      setExpiredToday(
        allLines.filter((l) => l.expires_at?.startsWith(today) && l.status === "expired").length,
      );
      setResellerCount((resRes.data ?? []).length);
      setActiveConnections((connRes.data ?? []).length);
      setServerCount((srvRes.data ?? []).length);

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(now, 6 - i);
        return { day: format(d, "EEE", { locale: es }), key: d.toISOString().split("T")[0], líneas: 0 };
      });
      for (const line of allLines) {
        if (!line.created_at) continue;
        const found = days.find((d) => d.key === line.created_at.split("T")[0]);
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

  const isOwner = reseller?.role === "owner";
  const creditsTotal     = reseller?.credits_total ?? 0;
  const creditsUsed      = reseller?.credits_used  ?? 0;
  const creditsAvailable = creditsTotal - creditsUsed;
  const creditPct        = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0;
  const demosThisMonth   = reseller?.demos_this_month ?? 0;
  const demosLimit       = reseller?.demos_limit      ?? 50;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>

      {/* ── Stat cards ── */}
      <div className={`grid grid-cols-2 gap-4 ${isOwner ? "lg:grid-cols-5" : "lg:grid-cols-3"}`}>
        <StatCard
          label="Líneas activas"
          value={activeLines}
          icon={<Tv2 className="size-5" />}
          color="green"
        />
        <StatCard
          label="Conectados ahora"
          value={activeConnections}
          sub="streams en vivo"
          icon={<Wifi className="size-5" />}
          color="violet"
        />
        {isOwner && (
          <StatCard
            label="Servidores"
            value={serverCount}
            sub="activos"
            icon={<Server className="size-5" />}
            color="blue"
          />
        )}
        {isOwner && (
          <StatCard
            label="Demos este mes"
            value={demosThisMonth}
            sub={`/ ${demosLimit} permitidos`}
            icon={<FlaskConical className="size-5" />}
            color="orange"
          />
        )}
        <StatCard
          label={isOwner ? "Resellers" : "Sub-resellers"}
          value={resellerCount}
          sub={expiredToday > 0 ? `${expiredToday} línea${expiredToday > 1 ? "s" : ""} exp. hoy` : undefined}
          icon={<Users className="size-5" />}
          color="orange"
        />
      </div>

      {/* ── Credit usage bar ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Créditos</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {creditsUsed.toLocaleString()} usados de {creditsTotal.toLocaleString()} totales
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-violet-600">{creditsAvailable.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">disponibles</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              creditPct > 80 ? "bg-orange-500" : creditPct > 50 ? "bg-amber-400" : "bg-violet-600"
            }`}
            style={{ width: `${creditPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{creditPct}% utilizado</p>
      </div>

      {/* ── Credit request (owner only) ── */}
      {isOwner && <CreditRequestCard />}

      {/* ── Chart ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          Líneas creadas — últimos 7 días
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: "#f5f3ff" }} />
            <Bar dataKey="líneas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Expiring soon ── */}
      {expiringSoon.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            ⚠️ Expiran en 48 h ({expiringSoon.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Username</th>
                  <th className="pb-2 font-medium">Paquete</th>
                  <th className="pb-2 font-medium">Reseller</th>
                  <th className="pb-2 font-medium">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expiringSoon.map((line) => (
                  <tr key={line.id} className="hover:bg-muted/20">
                    <td className="py-2.5 font-mono text-xs">{line.username}</td>
                    <td className="py-2.5 text-muted-foreground">{line.package?.name ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground text-xs">{(line as any).reseller?.name ?? "—"}</td>
                    <td className="py-2.5">
                      <span className="text-orange-600 text-xs font-medium">
                        {formatDistanceToNowStrict(new Date(line.expires_at), { addSuffix: true, locale: es })}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1.5">
                        ({format(new Date(line.expires_at), "d MMM HH:mm", { locale: es })})
                      </span>
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
