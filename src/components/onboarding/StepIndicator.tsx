import { Check } from "lucide-react";

interface Props {
  currentStep: number;
  deployPlatform?: string;
}

/**
 * Maps wizard steps (0-8) to sidebar indices (0-6).
 *   0     → 0  Token
 *   1-2   → 1  Supabase conectado
 *   3     → 2  Plataforma elegida
 *   4     → 3  Conectar plataforma
 *   5     → 4  Desplegar panel
 *   6     → 5  Build en progreso
 *   7     → 6  Credenciales admin
 *   8+    → 6  Panel activo (done)
 */
export function sidebarIdx(step: number): number {
  if (step <= 1) return step;
  if (step <= 2) return 1;
  if (step === 3) return 2;
  if (step === 4) return 3;
  if (step === 5) return 4;
  if (step === 6) return 5;
  return 6; // steps 7-8 and done
}

export const SIDEBAR_MAX = 6;

export default function StepIndicator({ currentStep, deployPlatform }: Props) {
  const isDocker = deployPlatform === "docker" || deployPlatform === "other";
  const isVercel = deployPlatform === "vercel";
  const isCloudflare = deployPlatform === "cloudflare";

  const connectLabel = isVercel
    ? "Conectar Vercel"
    : isCloudflare
    ? "Conectar Cloudflare"
    : isDocker
    ? "Tus Credenciales"
    : "Conectar plataforma";

  const deployLabel = isDocker ? "Ejecutar Docker" : "Desplegar panel";

  const steps = [
    "Token",
    "Supabase conectado",
    "Plataforma elegida",
    connectLabel,
    deployLabel,
    "Build en Vercel",
    "Credenciales admin",
  ];

  const activeSidebarIdx = sidebarIdx(currentStep);

  return (
    <ol className="flex flex-col gap-0">
      {steps.map((label, idx) => {
        const done   = activeSidebarIdx > idx;
        const active = activeSidebarIdx === idx;
        return (
          <li key={idx} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                  done
                    ? "bg-violet-600 border-violet-600 text-white"
                    : active
                    ? "border-violet-600 text-violet-600"
                    : "border-border text-muted-foreground"
                }`}
              >
                {done ? <Check className="size-3.5" /> : idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`w-px my-1 h-6 ${done ? "bg-violet-300" : "bg-border"}`}
                />
              )}
            </div>
            <span
              className={`pt-1 text-sm leading-tight ${
                active
                  ? "font-medium text-foreground"
                  : done
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
