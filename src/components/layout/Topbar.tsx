import { SidebarTrigger } from "@/components/ui/sidebar";

interface TopbarProps {
  title: string;
  breadcrumb?: string;
}

export default function Topbar({ title, breadcrumb }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/80 backdrop-blur-md px-3 sm:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
      <div className="min-w-0 flex-1 animate-fade-in">
        <h1 className="truncate text-[15px] font-semibold text-foreground">{title}</h1>
        {breadcrumb && <p className="truncate text-xs text-muted-foreground">{breadcrumb}</p>}
      </div>
    </header>
  );
}
