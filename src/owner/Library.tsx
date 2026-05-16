import { useNavigate, useLocation } from "react-router-dom";
import { Film, Tv, Radio, ListMusic, Server as ServerIcon, FolderArchive } from "lucide-react";
import { FolderCard } from "@/components/ui/folder-card";

/**
 * "Biblioteca" — modern folder-style entry view for the content the tenant
 * has organised on their server (movies, series, channels, bouquets, backups…).
 * Uses the 21stdev FolderCard component.
 */
export default function Library() {
  const navigate = useNavigate();
  const location = useLocation();
  const isPreview = location.pathname.startsWith("/owner-preview");
  const base = isPreview ? "/owner-preview" : "/owner";

  const folders = [
    { title: "Películas",   size: "VOD · Movies",     icon: <Film />,         variant: "default" as const, to: `${base}/vod` },
    { title: "Series",      size: "VOD · TV Shows",   icon: <Tv />,           variant: "project" as const, to: `${base}/vod` },
    { title: "Canales Live",size: "Streams en vivo",  icon: <Radio />,        variant: "system" as const,  to: `${base}/streams` },
    { title: "Bouquets",    size: "Listas armadas",   icon: <ListMusic />,    variant: "amber" as const,   to: `${base}/bouquets` },
    { title: "Servidores",  size: "Almacenamiento",   icon: <ServerIcon />,   variant: "emerald" as const, to: `${base}/servers` },
    { title: "Backups",     size: "Sistema",          icon: <FolderArchive />,variant: "rose" as const,    to: `${base}/settings` },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acceso rápido al contenido organizado por carpetas.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {folders.map((f) => (
          <FolderCard
            key={f.title}
            title={f.title}
            size={f.size}
            icon={f.icon}
            variant={f.variant}
            onClick={() => navigate(f.to)}
          />
        ))}
      </div>
    </div>
  );
}