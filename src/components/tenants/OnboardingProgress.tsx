import { ONBOARDING_STEPS } from "@/types/tenant";
import { Check } from "lucide-react";

export default function OnboardingProgress({ step, done }: { step: number; done: boolean }) {
  if (done) return <span className="inline-flex items-center rounded-full bg-success/10 text-success px-2 py-0.5 text-xs font-medium border border-success/20">Listo</span>;

  const pct = Math.round((step / ONBOARDING_STEPS.length) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{step}/{ONBOARDING_STEPS.length}</span>
    </div>
  );
}

export function OnboardingSteps({ step, done }: { step: number; done: boolean }) {
  return (
    <div className="space-y-2">
      {ONBOARDING_STEPS.map((label, i) => {
        const completed = done || i < step;
        return (
          <div key={i} className="flex items-center gap-2.5">
            <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${completed ? "bg-success text-success-foreground" : "border border-border text-muted-foreground"}`}>
              {completed && <Check className="h-3 w-3" />}
            </div>
            <span className={`text-sm ${completed ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
