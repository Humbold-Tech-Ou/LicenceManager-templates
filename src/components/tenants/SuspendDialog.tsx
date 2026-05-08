import { useEffect, useState } from "react";
import { Pause } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy?: boolean;
  onConfirm: (reason?: string) => void | Promise<void>;
}

export default function SuspendDialog({ open, onOpenChange, busy, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => { if (open) setReason(""); }, [open]);

  const handleConfirm = async () => {
    await onConfirm(reason.trim() || undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="size-5 text-destructive" /> Suspender tenant
          </DialogTitle>
          <DialogDescription>
            El dueño no podrá acceder a su panel hasta que sea reactivado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label>Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Falta de pago, abuso de términos..."
            rows={3}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            {busy ? "Suspendiendo..." : "Suspender"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
