import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOwnerAuth, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Users,
  Tv2,
  Package,
  Server,
  Film,
  Settings,
  LogOut,
  Radio,
  Menu,
  X,
  ListMusic,
  CalendarDays,
  MessageSquare,
} from "lucide-react";

const NAV_ALL = [
  { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/owner/lines", label: "Mis Líneas", icon: Tv2 },
  { to: "/owner/resellers", label: "Resellers", icon: Users },
];

const NAV_OWNER_BASE = [
  { to: "/owner/packages", label: "Paquetes",     icon: Package,        flag: "custom_packages" as const },
  { to: "/owner/servers",  label: "Servidores",   icon: Server,         flag: null },
  { to: "/owner/streams",  label: "Canales Live", icon: Radio,          flag: "streams" as const },
  { to: "/owner/vod",      label: "VOD",          icon: Film,           flag: "vod" as const },
  { to: "/owner/bouquets", label: "Bouquets",     icon: ListMusic,      flag: null },
  { to: "/owner/epg",      label: "EPG",          icon: CalendarDays,   flag: "streams" as const },
  { to: "/owner/tickets",  label: "Tickets",      icon: MessageSquare,  flag: null },
  { to: "/owner/settings", label: "Configuración",icon: Settings,       flag: null },
];

function SidebarLink({
  to,
  label,
  icon: Icon,
  primaryColor,
  collapsed,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  primaryColor: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      style={({ isActive }) => isActive
        ? { backgroundColor: `rgba(${hexToRgb(primaryColor)}, 0.08)`, color: primaryColor }
        : undefined
      }
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors font-${isActive ? "medium" : "normal"} ${
          isActive ? "" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
        }`}
      >
        {label}
      </span>
    </NavLink>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 124;
  const g = parseInt(h.substring(2, 4), 16) || 58;
  const b = parseInt(h.substring(4, 6), 16) || 237;
  return `${r}, ${g}, ${b}`;
}

/** Inject primary_color from panel config as CSS custom properties */
function BrandingApplier({ color }: { color: string }) {
  useEffect(() => {
    if (!color) return;
    // Validate it's a real hex/css color before injecting
    const el = document.createElement("div");
    el.style.color = color;
    if (!el.style.color) return;

    // Set custom property on the panel root
    const styleId = "owner-panel-branding";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    // Convert hex to RGB components for opacity-variant usage
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    styleEl.textContent = `
      [data-owner-panel] {
        --brand: ${color};
        --brand-r: ${isNaN(r) ? 124 : r};
        --brand-g: ${isNaN(g) ? 58  : g};
        --brand-b: ${isNaN(b) ? 237 : b};
        --brand-50: rgba(var(--brand-r), var(--brand-g), var(--brand-b), 0.08);
        --brand-100: rgba(var(--brand-r), var(--brand-g), var(--brand-b), 0.15);
        --brand-600: ${color};
        --brand-700: ${color};
      }
    `;
    return () => { styleEl!.textContent = ""; };
  }, [color]);
  return null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export default function OwnerLayout() {
  const { reseller, signOut } = useOwnerAuth();
  const config = useOwnerConfig();
  const navigate = useNavigate();
  const primaryColor = config.branding?.primary_color || "#7C3AED";
  const features = config.features;
  const isMobile = useIsMobile();

  // Collapsed state (desktop only, persisted)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("owner-sidebar-collapsed") === "true";
  });

  // Mobile open state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("owner-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  }, [isMobile]);

  const closeMobileSidebar = useCallback(() => {
    if (isMobile) setMobileOpen(false);
  }, [isMobile]);

  // Filter nav items by feature flags
  const NAV_OWNER = NAV_OWNER_BASE.filter(
    item => item.flag === null || features[item.flag] !== false
  );

  async function handleSignOut() {
    await signOut();
    navigate("/owner/login", { replace: true });
  }

  const isOwner = reseller?.role === "owner";

  // Determine effective collapsed state (never collapsed when mobile overlay is open)
  const effectiveCollapsed = isMobile ? false : collapsed;
  const sidebarVisible = isMobile ? mobileOpen : true;

  const sidebarWidth = effectiveCollapsed ? "w-14" : "w-[220px]";

  return (
    <div className="flex min-h-screen bg-background" data-owner-panel>
      <BrandingApplier color={primaryColor} />

      {/* Mobile backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 transition-opacity"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-[220px] transform transition-transform duration-200 ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`
            : `${sidebarWidth} shrink-0 transition-all duration-200`
          }
          border-r border-zinc-200 bg-white flex flex-col
        `}
      >
        {/* Brand — accent bar with primary color + toggle */}
        <div
          className="px-3 py-3 border-b border-zinc-200 flex items-center gap-2"
          style={{ borderTopWidth: 3, borderTopColor: primaryColor }}
        >
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors shrink-0"
            aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isMobile && mobileOpen ? (
              <X className="size-4" />
            ) : (
              <Menu className="size-4" />
            )}
          </button>
          {!effectiveCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate" style={{ color: primaryColor }}>
                {config.branding.name}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {reseller?.name}
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ALL.map((item) => (
            <SidebarLink
              key={item.to}
              {...item}
              primaryColor={primaryColor}
              collapsed={effectiveCollapsed}
              onNavigate={closeMobileSidebar}
            />
          ))}

          {isOwner && (
            <>
              <div className={`pt-3 pb-1 ${effectiveCollapsed ? "px-0 flex justify-center" : "px-3"}`}>
                {!effectiveCollapsed && (
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                    Administración
                  </p>
                )}
                {effectiveCollapsed && (
                  <div className="w-4 border-t border-zinc-300" />
                )}
              </div>
              {NAV_OWNER.map((item) => (
                <SidebarLink
                  key={item.to}
                  {...item}
                  primaryColor={primaryColor}
                  collapsed={effectiveCollapsed}
                  onNavigate={closeMobileSidebar}
                />
              ))}
            </>
          )}
        </nav>

        {/* Credits badge */}
        {reseller && !effectiveCollapsed && (
          <div className="px-4 py-3 border-t border-zinc-200">
            <p className="text-xs text-muted-foreground">Créditos disponibles</p>
            <p className="text-lg font-bold" style={{ color: primaryColor }}>
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
            title={effectiveCollapsed ? "Salir" : undefined}
            className={`w-full ${effectiveCollapsed ? "justify-center px-0" : "justify-start"} gap-2 text-zinc-500 hover:text-zinc-900`}
          >
            <LogOut className="size-4 shrink-0" />
            {!effectiveCollapsed && <span>Salir</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile toggle button (visible when sidebar is hidden on mobile) */}
      {isMobile && !mobileOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-3 left-3 z-30 p-2 rounded-md bg-white border border-zinc-200 shadow-sm text-zinc-600 hover:text-zinc-900 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="size-5" />
        </button>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
