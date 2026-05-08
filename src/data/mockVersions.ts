// ── Mock data for Panel Versions (Modo Dios) ─────────────────────────────────
// Replace with real Supabase queries when the DB table is created.

export type VersionStatus = "draft" | "published" | "deprecated";

export interface VersionTenant {
  id: string;
  name: string;
  plan: "basic" | "pro" | "enterprise";
}

export interface PanelVersion {
  id: string;
  version: string;
  status: VersionStatus;
  updatedAt: string; // ISO 8601
  activeTenants: number;
  releaseNotes: string;
  previewUrl: string;
  tenants: VersionTenant[];
}

export const MOCK_VERSIONS: PanelVersion[] = [
  {
    id: "v1-2-0",
    version: "v1.2.0",
    status: "draft",
    updatedAt: "2026-04-23T10:00:00Z",
    activeTenants: 0,
    releaseNotes:
      "- Nueva interfaz de gestión de canales con drag & drop\n- Mejoras de rendimiento en el catálogo VOD\n- Corrección de bug en filtros de búsqueda avanzada\n- Soporte para listas M3U extendidas",
    previewUrl: "https://vivacore-panel.vercel.app",
    tenants: [],
  },
  {
    id: "v1-1-0",
    version: "v1.1.0",
    status: "published",
    updatedAt: "2026-04-20T10:00:00Z",
    activeTenants: 12,
    releaseNotes:
      "- Integración completa con Supabase Auth\n- Panel de estadísticas rediseñado\n- Soporte para múltiples idiomas (ES, EN, PT)\n- Mejoras de rendimiento en carga inicial",
    previewUrl: "https://vivacore-panel.vercel.app",
    tenants: [
      { id: "t1", name: "Yhoel Gascon", plan: "pro" },
      { id: "t2", name: "Carlos Media Group", plan: "enterprise" },
      { id: "t3", name: "Stream Plus SRL", plan: "basic" },
      { id: "t4", name: "TeleCloud", plan: "pro" },
      { id: "t5", name: "MediaFlow", plan: "basic" },
    ],
  },
  {
    id: "v1-0-0",
    version: "v1.0.0",
    status: "deprecated",
    updatedAt: "2026-04-01T10:00:00Z",
    activeTenants: 3,
    releaseNotes:
      "- Versión inicial del panel\n- Gestión básica de licencias y canales\n- Autenticación por token",
    previewUrl: "https://vivacore-panel.vercel.app",
    tenants: [
      { id: "t6", name: "IptvPlus", plan: "basic" },
      { id: "t7", name: "TeleStream", plan: "basic" },
      { id: "t8", name: "Canal Digital", plan: "basic" },
    ],
  },
];
