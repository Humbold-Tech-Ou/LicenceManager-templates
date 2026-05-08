import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { loadOnboardingLS } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");
  // Prevent React StrictMode double-invoke from consuming the CSRF nonce twice
  const invoked = useRef(false);

  useEffect(() => {
    if (invoked.current) return;
    invoked.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    // No code → legacy backend-redirect path (connected + step params already set)
    if (!code || !state) {
      const connected = searchParams.get("connected");
      const tenantIdParam = searchParams.get("tenant_id");
      const stepParam = searchParams.get("step");
      const persisted = loadOnboardingLS();
      const tenantId = tenantIdParam ?? persisted?.tenantId;
      if (!tenantId) { navigate("/", { replace: true }); return; }
      const nextStep = stepParam
        ? parseInt(stepParam)
        : persisted?.step != null
        ? persisted.step + 1
        : undefined;
      const params = new URLSearchParams();
      if (connected) params.set("connected", connected);
      if (nextStep !== undefined) params.set("step", String(nextStep));
      navigate(`/onboarding/${tenantId}?${params.toString()}`, { replace: true });
      return;
    }

    // New flow: POST code + state to edge function, which does the token exchange
    // Also forward teamId — Vercel Integration redirects include ?teamId=team_xxx
    // when the user installed the integration under a Vercel Team (not personal account).
    const teamId = searchParams.get("teamId") ?? searchParams.get("team_id") ?? null;
    (async () => {
      try {
        // Determine the exact redirect_uri this page was served on so the edge
        // function can forward it verbatim to the OAuth provider.
        const redirectUri = window.location.origin + window.location.pathname; // e.g. .../oauth/vercel/callback
        const { data, error } = await supabase.functions.invoke("oauth-callback", {
          body: { code, state, base_url: window.location.origin, redirect_uri: redirectUri, team_id: teamId },
        });

        if (error || !data?.success) {
          const detail = data?.error ?? error?.message ?? "Error desconocido";
          console.error("OAuth callback error:", detail, error ?? data);
          setErrorMsg(`Error al conectar: ${detail}`);
          return;
        }

        const persisted = loadOnboardingLS();
        const resolvedTenantId = data.tenantId ?? persisted?.tenantId;

        if (!resolvedTenantId) {
          navigate("/", { replace: true });
          return;
        }

        navigate(
          `/onboarding/${resolvedTenantId}?step=${data.step}&connected=${data.provider}`,
          { replace: true }
        );
      } catch (err) {
        console.error("OAuth callback exception:", err);
        setErrorMsg("Error inesperado. Por favor intenta de nuevo.");
      }
    })();
  }, []);

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-destructive">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-6 animate-spin text-violet-600" />
      <p className="text-sm text-muted-foreground">Verificando conexión...</p>
    </div>
  );
}
