import type { Tables } from "@/integrations/supabase/types";

export type Tenant = Tables<"tenants">;
export type LicenseEvent = Tables<"license_events">;

export type TenantPlan = "basic" | "pro" | "enterprise";
export type TenantStatus = "active" | "suspended" | "expired";
export type DeployPlatform = "vercel" | "cloudflare" | "railway" | "render" | "other";

// Sidebar labels — steps 3 & 4 are overridden dynamically in StepIndicator
export const ONBOARDING_STEPS = [
  "Supabase conectado",
  "Plataforma elegida",
  "Preparación",
  "Despliegue",
  "Panel activo",
] as const;
