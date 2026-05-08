// Single source of truth para tipos y labels de license_events.

export type TenantEventType =
  | "created"
  | "renewed"
  | "suspended"
  | "reactivated"
  | "upgraded"
  | "downgraded"
  | "plan_changed"
  | "credits_added"
  | "credits_adjusted"
  | "credits_removed"
  | "expired"
  | "deleted"
  | "supabase_connected"
  | "deploy_connected"
  | "deploy_triggered"
  | "deploy_created"
  | "supabase_schema_deployed"
  | "onboarding_step_completed"
  | "onboarding_done"
  | "onboarding_reset"
  | "welcome_email_sent";

export interface EventConfig {
  label: string;
  /** Tailwind bg-* token color para el dot del timeline */
  dotColor: string;
}

export const EVENT_CONFIG: Record<TenantEventType, EventConfig> = {
  created: { label: "Licencia creada", dotColor: "bg-success" },
  renewed: { label: "Licencia renovada", dotColor: "bg-success" },
  suspended: { label: "Licencia suspendida", dotColor: "bg-warning" },
  reactivated: { label: "Licencia reactivada", dotColor: "bg-success" },
  upgraded: { label: "Plan mejorado", dotColor: "bg-info" },
  downgraded: { label: "Plan reducido", dotColor: "bg-warning" },
  plan_changed: { label: "Plan modificado", dotColor: "bg-info" },
  credits_added: { label: "Créditos agregados", dotColor: "bg-primary" },
  credits_adjusted: { label: "Créditos ajustados", dotColor: "bg-primary" },
  credits_removed: { label: "Créditos removidos", dotColor: "bg-warning" },
  expired: { label: "Licencia expirada", dotColor: "bg-destructive" },
  deleted: { label: "Tenant eliminado", dotColor: "bg-destructive" },
  supabase_connected: { label: "Supabase conectado", dotColor: "bg-success" },
  deploy_connected: { label: "Deploy conectado", dotColor: "bg-success" },
  deploy_triggered: { label: "Deploy iniciado", dotColor: "bg-info" },
  deploy_created: { label: "Proyecto creado", dotColor: "bg-success" },
  supabase_schema_deployed: { label: "Schema desplegado", dotColor: "bg-success" },
  onboarding_step_completed: { label: "Paso de onboarding", dotColor: "bg-primary" },
  onboarding_done: { label: "Onboarding completado", dotColor: "bg-success" },
  onboarding_reset: { label: "Onboarding reseteado", dotColor: "bg-warning" },
  welcome_email_sent: { label: "Welcome email enviado", dotColor: "bg-info" },
};

export function getEventConfig(type: string): EventConfig {
  return EVENT_CONFIG[type as TenantEventType] ?? { label: type, dotColor: "bg-muted-foreground" };
}
