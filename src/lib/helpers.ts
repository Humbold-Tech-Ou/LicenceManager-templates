import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  } catch {
    toast.error("No se pudo copiar");
  }
}

export async function invokeEdgeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data as T;
}

/** Tagged error so callers can detect specific failure modes */
export class EdgeFunctionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "EdgeFunctionError";
  }
}

/** For onboarding wizard calls — passes tenant token instead of superadmin JWT */
export async function invokeEdgeFunctionWithToken<T = unknown>(
  name: string,
  body: Record<string, unknown>,
  tenantToken: string
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { "X-Tenant-Token": tenantToken },
  });

  if (error) {
    // Try to extract the JSON body from the HTTP error for richer error handling
    try {
      const ctx = (error as any).context as Response | undefined;
      if (ctx?.json) {
        const body = await ctx.json();
        const code = body?.code ?? (body?.error ?? "EDGE_ERROR");
        throw new EdgeFunctionError(code, body?.error ?? error.message);
      }
    } catch (parseErr) {
      if (parseErr instanceof EdgeFunctionError) throw parseErr;
    }
    throw error;
  }

  return data as T;
}
