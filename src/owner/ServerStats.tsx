import { useEffect, useState, useCallback } from "react";
import { ownerSupabase } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Server as ServerIcon,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  RefreshCw,
  Activity,
  Wifi,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { Server } from "@/types/owner-panel";

const SUPABASE_FUNCTIONS_URL = "https://rrresinucnxfdaaqcqcp.supabase.co";
const SUPABASE_ANON_KEY_PUB =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycmVzaW51Y254ZmRhYXFjcWNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzI5OTksImV4cCI6MjA5MTkwODk5OX0.PHQTe4-m5Nv16SXK64xLSybO-rh9_ZLiCiRO_KRam2I";

interface ServerStats {
  uptime_seconds: number;
  load_avg: [number, number, number];
  memory: { total: number; used: number; free: number; percent: number };
  disk: { total: number; used: number; free: number; percent: number };
  cpu_count: number;
  cpu_percent: number;
  network: { rx_bytes: number; tx_bytes: number };
  tcp_connections: { established: number; total: number };
  hostname: string;
}

interface ServerWithStats extends Server {
  stats?: ServerStats | null;
  statsLoading?: boolean;
  statsError?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function ProgressBar({
  percent,
  color = "violet",
}: {
  percent: number;
  color?: "violet" | "green" | "orange" | "red" | "blue";
}) {
  const colorMap = {
    violet: "bg-violet-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
  };
  const barColor =
    percent > 90 ? colorMap.red : percent > 70 ? colorMap.orange : colorMap[color];
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

function StatMetric({
  icon,
  label,
  value,
  sub,
  percent,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  percent?: number;
  color?: "violet" | "green" | "orange" | "red" | "blue";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {typeof percent === "number" && <ProgressBar percent={percent} color={color} />}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ServerStatsPage() {
  const [servers, setServers] = useState<ServerWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers() {
    setLoading(true);
    const { data } = await ownerSupabase
      .from("servers")
      .select("*")
      .eq("protocol", "ssh")
      .order("created_at");
    setServers(
      (data ?? []).map((s) => ({
        ...s,
        stats: null,
        statsLoading: false,
        statsError: null,
      }))
    );
    setLoading(false);
  }

  const fetchStats = useCallback(async (srv: Server) => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === srv.id ? { ...s, statsLoading: true, statsError: null } : s
      )
    );

    try {
      // Get SSH secret from Vault
      let secret = "";
      let passphrase = "";
      try {
        const { data } = await ownerSupabase.rpc("get_server_ssh_secret", {
          _server_id: srv.id,
        });
        if (typeof data === "string" && data.length > 0) secret = data;
      } catch {
        /* user may need to re-enter */
      }

      if (!secret) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === srv.id
              ? { ...s, statsLoading: false, statsError: "No se encontró la clave SSH en Vault. Edita el servidor para guardarla." }
              : s
          )
        );
        return;
      }

      const body: Record<string, unknown> = {
        host: srv.ip,
        port: srv.port || 22,
        username: srv.ssh_username,
      };

      if (srv.ssh_auth_method === "key") {
        body.private_key = secret;
        if (passphrase) body.passphrase = passphrase;
      } else {
        body.password = secret;
      }

      const res = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/functions/v1/get-server-stats`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY_PUB,
            Authorization: `Bearer ${SUPABASE_ANON_KEY_PUB}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20000),
        }
      );

      const data = await res.json();
      if (data?.ok && data.stats) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === srv.id
              ? { ...s, stats: data.stats, statsLoading: false, statsError: null }
              : s
          )
        );
      } else {
        setServers((prev) =>
          prev.map((s) =>
            s.id === srv.id
              ? { ...s, statsLoading: false, statsError: data?.error ?? "Error desconocido" }
              : s
          )
        );
      }
    } catch (err) {
      setServers((prev) =>
        prev.map((s) =>
          s.id === srv.id
            ? {
                ...s,
                statsLoading: false,
                statsError: err instanceof Error ? err.message : "Error de red",
              }
            : s
        )
      );
    }
  }, []);

  function refreshAll() {
    const sshServers = servers.filter((s) => s.protocol === "ssh");
    for (const srv of sshServers) {
      fetchStats(srv);
    }
    toast.success(`Actualizando ${sshServers.length} servidor${sshServers.length !== 1 ? "es" : ""}…`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="size-5 text-violet-600" />
            Server Stats
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitorea en tiempo real el estado de tus servidores SSH.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={refreshAll}
          disabled={servers.length === 0}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw className="size-4" />
          Actualizar todos
        </Button>
      </div>

      {servers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <ServerIcon className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay servidores SSH configurados. Agrega un servidor con protocolo SSH para
            ver sus estadísticas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {servers.map((srv) => (
            <div
              key={srv.id}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <ServerIcon className="size-4 text-violet-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {srv.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {srv.ip}:{srv.port}
                      {srv.stats?.hostname ? ` (${srv.stats.hostname})` : ""}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={srv.stats ? "ghost" : "default"}
                  onClick={() => fetchStats(srv)}
                  disabled={srv.statsLoading}
                  className={
                    srv.stats
                      ? "gap-1.5 text-xs"
                      : "gap-1.5 bg-violet-600 hover:bg-violet-700"
                  }
                >
                  {srv.statsLoading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3.5" />
                  )}
                  {srv.stats ? "Actualizar" : "Cargar stats"}
                </Button>
              </div>

              {/* Card body */}
              <div className="p-5">
                {srv.statsLoading && !srv.stats && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-violet-600" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Conectando por SSH…
                    </span>
                  </div>
                )}

                {srv.statsError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                    <AlertTriangle className="size-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Error</p>
                      <p className="text-xs text-red-600 mt-0.5">{srv.statsError}</p>
                    </div>
                  </div>
                )}

                {!srv.stats && !srv.statsLoading && !srv.statsError && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Haz clic en "Cargar stats" para ver las métricas del servidor.
                  </p>
                )}

                {srv.stats && (
                  <div className="grid grid-cols-2 gap-4">
                    <StatMetric
                      icon={<Clock className="size-3.5" />}
                      label="Uptime"
                      value={formatUptime(srv.stats.uptime_seconds)}
                      color="green"
                    />
                    <StatMetric
                      icon={<Cpu className="size-3.5" />}
                      label={`CPU (${srv.stats.cpu_count} cores)`}
                      value={`${srv.stats.cpu_percent}%`}
                      sub={`Load: ${srv.stats.load_avg.map((l) => l.toFixed(2)).join(", ")}`}
                      percent={srv.stats.cpu_percent}
                      color="violet"
                    />
                    <StatMetric
                      icon={<MemoryStick className="size-3.5" />}
                      label="Memoria RAM"
                      value={`${formatBytes(srv.stats.memory.used)} / ${formatBytes(srv.stats.memory.total)}`}
                      sub={`${srv.stats.memory.percent}% utilizado`}
                      percent={srv.stats.memory.percent}
                      color="blue"
                    />
                    <StatMetric
                      icon={<HardDrive className="size-3.5" />}
                      label="Disco"
                      value={`${formatBytes(srv.stats.disk.used)} / ${formatBytes(srv.stats.disk.total)}`}
                      sub={`${srv.stats.disk.percent}% utilizado`}
                      percent={srv.stats.disk.percent}
                      color="orange"
                    />
                    <StatMetric
                      icon={<Network className="size-3.5" />}
                      label="Red"
                      value={`${formatBytes(srv.stats.network.tx_bytes)} enviados`}
                      sub={`${formatBytes(srv.stats.network.rx_bytes)} recibidos`}
                    />
                    <StatMetric
                      icon={<Wifi className="size-3.5" />}
                      label="Conexiones TCP"
                      value={`${srv.stats.tcp_connections.established}`}
                      sub={`${srv.stats.tcp_connections.total} total (${srv.stats.tcp_connections.established} establecidas)`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
