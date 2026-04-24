import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TenantPlan } from "@/types/tenant";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentPlan: TenantPlan;
  busy?: boolean;
  onConfirm: (plan: TenantPlan) => void | Promise<void>;
}

export default function ChangePlanDialog({ open, onOpenChange, currentPlan, busy, onConfirm }: Props) {
  const [plan, setPlan] = useState<TenantPlan>(currentPlan);

  useEffect(() => { if (open) setPlan(currentPlan); }, [open, currentPlan]);

  const handleConfirm = async () => {
    await onConfirm(plan);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-primary" /> Cambiar plan
          </DialogTitle>
          <DialogDescription>Plan actual: <span className="font-medium capitalize">{currentPlan}</span></DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>Nuevo plan</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as TenantPlan)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={busy || plan === currentPlan}>
            {busy ? "Guardando..." : "Cambiar plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
