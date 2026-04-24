import { useEffect, useMemo, useState } from "react";
import { Coins, Plus, Minus, Equal } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Mode = "add" | "subtract" | "set";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentCredits: number;
  busy?: boolean;
  onConfirm: (delta: number, mode: Mode) => void | Promise<void>;
}

export default function AdjustCreditsDialog({ open, onOpenChange, currentCredits, busy, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>("add");
  const [value, setValue] = useState("");

  useEffect(() => { if (open) { setMode("add"); setValue(""); } }, [open]);

  const numeric = Number(value);
  const valid = value !== "" && !isNaN(numeric) && numeric >= 0;

  const preview = useMemo(() => {
    if (!valid) return currentCredits;
    if (mode === "set") return numeric;
    if (mode === "add") return currentCredits + numeric;
    return Math.max(0, currentCredits - numeric);
  }, [mode, numeric, valid, currentCredits]);

  const handleConfirm = async () => {
    if (!valid) return;
    await onConfirm(numeric, mode);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-primary" /> Ajustar créditos
          </DialogTitle>
          <DialogDescription>Créditos actuales: <span className="font-medium">{currentCredits}</span></DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Operación</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant={mode === "add" ? "default" : "outline"} size="sm" onClick={() => setMode("add")}>
                <Plus className="size-3.5" /> Sumar
              </Button>
              <Button type="button" variant={mode === "subtract" ? "default" : "outline"} size="sm" onClick={() => setMode("subtract")}>
                <Minus className="size-3.5" /> Restar
              </Button>
              <Button type="button" variant={mode === "set" ? "default" : "outline"} size="sm" onClick={() => setMode("set")}>
                <Equal className="size-3.5" /> Fijar
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cantidad</Label>
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              inputMode="numeric"
            />
          </div>

          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Resultado: </span>
            <span className="font-semibold">{currentCredits} → {preview}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={busy || !valid}>
            {busy ? "Guardando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
