import { Check } from "lucide-react";

interface Props {
  currentStep: number;
  /** Platform chosen at step 3 — drives dynamic sidebar labels for steps 4-5 */
  deployPlatform?: string;
}

/**
 * Maps wizard steps (0-7) to sidebar indices (0-5).
 *   0     → 0  Token
 *   1-2   → 1  Supabase conectado
 *   3     → 2  Plataforma elegida
 *   4     → 3  Copiar Plantilla / Tus Credenciales
 *   5     → 4  Despliegue / Ejecutar Docker
 *   6-7   → 5  Panel activo
 */
export function sidebarIdx(step: number): number {
  if (step <= 1) return step;
  if (step <= 2) return 1;
  if (step === 3) return 2;
  if (step === 4) return 3;
  if (step === 5) return 4;
  return 5; // steps 6-7 and done
}

export const SIDEBAR_MAX = 5; // max sidebar index (used for progress bar denominator)

export default function StepIndicator({ currentStep, deployPlatform }: Props) {
  const isDocker = deployPlatform === "docker" || deployPlatform === "other";

  const steps = [
    "Token",
    "Supabase conectado",
    "Plataforma elegida",
    isDocker ? "Tus Credenciales" : "Copiar Plantilla",
    isDocker ? "Ejecutar Docker"  : "Despliegue",
    "Panel activo",
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
