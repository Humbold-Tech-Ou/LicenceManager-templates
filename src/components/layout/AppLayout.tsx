import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-bg-secondary">
        <AppSidebar />
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
