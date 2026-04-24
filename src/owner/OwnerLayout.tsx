import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOwnerAuth, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Tv2,
  Package,
  Server,
  Film,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

const NAV_ALL = [
  { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/owner/lines", label: "Mis Líneas", icon: Tv2 },
  { to: "/owner/resellers", label: "Resellers", icon: Users },
];

const NAV_OWNER = [
  { to: "/owner/packages", label: "Paquetes", icon: Package },
  { to: "/owner/servers", label: "Servidores", icon: Server },
  { to: "/owner/vod", label: "VOD", icon: Film },
  { to: "/owner/settings", label: "Configuración", icon: Settings },
];

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-violet-50 text-violet-700 font-medium"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        }`
      }
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </NavLink>
  );
}

export default function OwnerLayout() {
  const { reseller, signOut } = useOwnerAuth();
  const config = useOwnerConfig();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/owner/login", { replace: true });
  }

  const isOwner = reseller?.role === "owner";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-zinc-200 bg-white flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-zinc-200">
          <p className="text-sm font-semibold text-foreground truncate">
            {config.branding.name}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {reseller?.name}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ALL.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}

          {isOwner && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  Administración
                </p>
              </div>
              {NAV_OWNER.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </>
          )}
        </nav>

        {/* Credits badge */}
        {reseller && (
          <div className="px-4 py-3 border-t border-zinc-200">
            <p className="text-xs text-muted-foreground">Créditos disponibles</p>
            <p className="text-lg font-bold text-violet-600">
              {(reseller.credits_total - reseller.credits_used).toLocaleString()}
            </p>
          </div>
        )}

        {/* Sign out */}
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start gap-2 text-zinc-500 hover:text-zinc-900"
          >
            <LogOut className="size-4" />
            Salir
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
