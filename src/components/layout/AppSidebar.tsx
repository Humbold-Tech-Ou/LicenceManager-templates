import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, Shield, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { to: "/dashboard",  label: "Dashboard",          icon: LayoutDashboard },
  { to: "/tenants",    label: "Tenants",             icon: Users           },
  { to: "/versions",   label: "Versiones de Panel",  icon: Layers          },
  { to: "/settings",   label: "Configuración",       icon: Settings        },
];

export default function AppSidebar() {
  const { user, signOut } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "SA";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className={cn("flex items-center gap-2.5 transition-all", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm transition-transform hover:scale-105">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold text-sidebar-foreground animate-fade-in">
              License Manager
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = location.pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      className={cn(
                        "group relative h-10 overflow-hidden transition-all duration-200",
                        active
                          ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-foreground font-medium hover:from-primary/15 hover:via-primary/8"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      <NavLink to={item.to}>
                        {/* Active indicator bar */}
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary origin-center animate-indicator-grow"
                            aria-hidden
                          />
                        )}
                        <item.icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-all duration-200",
                            active ? "text-primary scale-110" : "group-hover:scale-110"
                          )}
                        />
                        <span className={cn("transition-colors", active && "text-foreground")}>
                          {item.label}
                        </span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/40", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary ring-2 ring-primary/5">
            {initials}
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-xs text-muted-foreground animate-fade-in">{user?.email}</span>
              <button
                onClick={signOut}
                aria-label="Cerrar sesión"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
