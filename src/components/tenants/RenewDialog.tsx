import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentExpiresAt: string;
  busy?: boolean;
  onConfirm: (value: number | Date) => void | Promise<void>;
}

const PRESETS = [
  { label: "30 días", value: 30 },
  { label: "90 días", value: 90 },
  { label: "365 días", value: 365 },
];

export default function RenewDialog({ open, onOpenChange, currentExpiresAt, busy, onConfirm }: Props) {
  const [selected, setSelected] = useState<number | "custom">(30);
  const [customDate, setCustomDate] = useState<Date | undefined>();

  const handleConfirm = async () => {
    if (selected === "custom") {
      if (!customDate) return;
      await onConfirm(customDate);
    } else {
      await onConfirm(selected);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-5 text-primary" /> Renovar licencia
          </DialogTitle>
          <DialogDescription>
            Vence actualmente el {format(new Date(currentExpiresAt), "d MMM yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label>Período</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.value}
                type="button"
                variant={selected === p.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelected(p.value)}
              >
                {p.label}
              </Button>
            ))}
            <Button
              type="button"
              variant={selected === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelected("custom")}
            >
              Custom
            </Button>
          </div>

          {selected === "custom" && (
            <div className="space-y-1.5 pt-2">
              <Label>Fecha de expiración</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !customDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={setCustomDate}
                    disabled={(d) => d <= new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={busy || (selected === "custom" && !customDate)}>
            {busy ? "Renovando..." : "Renovar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
