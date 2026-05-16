import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOwnerAuth, useOwnerConfig } from "@/hooks/useOwnerPanel";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
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
  Radio,
} from "lucide-react";

const NAV_ALL = [
  { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/owner/lines", label: "Mis Líneas", icon: Tv2 },
  { to: "/owner/resellers", label: "Resellers", icon: Users },
];

const NAV_OWNER_BASE = [
  { to: "/owner/packages", label: "Paquetes",     icon: Package, flag: "custom_packages" as const },
  { to: "/owner/servers",  label: "Servidores",   icon: Server,  flag: null },
  { to: "/owner/streams",  label: "Canales Live", icon: Radio,   flag: "streams" as const },
  { to: "/owner/vod",      label: "VOD",          icon: Film,    flag: "vod" as const },
  { to: "/owner/settings", label: "Configuración",icon: Settings, flag: null },
];

function SidebarLink({
  to,
  label,
  icon: Icon,
  primaryColor,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  primaryColor: string;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => isActive
        ? { backgroundColor: `rgba(${hexToRgb(primaryColor)}, 0.08)`, color: primaryColor }
        : undefined
      }
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors font-${isActive ? "medium" : "normal"} ${
          isActive ? "" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        }`
      }
    >
      <Icon className="size-4 shrink-0" />
      {label}
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

export default function OwnerLayout() {
  const { reseller, signOut } = useOwnerAuth();
  const config = useOwnerConfig();
  const navigate = useNavigate();
  const primaryColor = config.branding?.primary_color || "#7C3AED";
  const features = config.features;

  // Filter nav items by feature flags
  const NAV_OWNER = NAV_OWNER_BASE.filter(
    item => item.flag === null || features[item.flag] !== false
  );

  async function handleSignOut() {
    await signOut();
    navigate("/owner/login", { replace: true });
  }

  const isOwner = reseller?.role === "owner";

  return (
    <div className="flex min-h-screen bg-background" data-owner-panel>
      <BrandingApplier color={primaryColor} />
      {/* Sidebar */}
      <aside className="w-[220px] shrink-0 border-r border-zinc-200 bg-white flex flex-col">
        {/* Brand — accent bar with primary color */}
        <div className="px-4 py-4 border-b border-zinc-200" style={{ borderTopWidth: 3, borderTopColor: primaryColor }}>
          <p className="text-sm font-semibold truncate" style={{ color: primaryColor }}>
            {config.branding.name}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {reseller?.name}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV_ALL.map((item) => (
            <SidebarLink key={item.to} {...item} primaryColor={primaryColor} />
          ))}

          {isOwner && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                  Administración
                </p>
              </div>
              {NAV_OWNER.map((item) => (
                <SidebarLink key={item.to} {...item} primaryColor={primaryColor} />
              ))}
            </>
          )}
        </nav>

        {/* Credits badge */}
        {reseller && (
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
