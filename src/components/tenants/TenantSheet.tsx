import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { copyToClipboard, invokeEdgeFunction } from "@/lib/helpers";

const schema = z.object({
  owner_email: z.string().email("Email inválido"),
  owner_name: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  plan: z.enum(["basic", "pro", "enterprise"]),
  expires_at: z.date({ message: "Selecciona una fecha" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function TenantSheet({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { plan: "basic", owner_name: "", password: "", notes: "" },
  });

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    try {
      // 1. Create auth user first
      const authRes = (await invokeEdgeFunction("create-auth-user", {
        email: values.owner_email,
        password: values.password,
      })) as { error?: string; user_id?: string };
      if (authRes?.error) throw new Error(authRes.error);

      // 2. Create tenant record
      const { data, error } = await supabase
        .from("tenants")
        .insert({
          owner_email: values.owner_email,
          owner_name: values.owner_name || null,
          plan: values.plan,
          expires_at: values.expires_at.toISOString(),
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("license_events").insert({
        tenant_id: data.id,
        event_type: "created",
        metadata: { plan: values.plan },
      });

      // Non-blocking — email failure must not block tenant creation
      invokeEdgeFunction("send-welcome-email", { tenant_id: data.id, base_url: window.location.origin }).catch(() => {});

      await copyToClipboard(data.tenant_token);
      toast.success(`Tenant creado. Token: ${data.tenant_token} (copiado)`);
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear tenant");
    } finally {
      setLoading(false);
    }
  };

  const expiresAt = form.watch("expires_at");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[420px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo tenant</SheetTitle>
          <SheetDescription>Crea una nueva licencia para un dueño de panel</SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label>Email del dueño *</Label>
            <Input {...form.register("owner_email")} placeholder="admin@ejemplo.com" />
            {form.formState.errors.owner_email && <p className="text-xs text-destructive">{form.formState.errors.owner_email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input {...form.register("owner_name")} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-1.5">
            <Label>Contraseña *</Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                {...form.register("password")}
                placeholder="Mínimo 8 caracteres"
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Plan *</Label>
            <Select value={form.watch("plan")} onValueChange={(v) => form.setValue("plan", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expira *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !expiresAt && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expiresAt ? format(expiresAt, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiresAt}
                  onSelect={(d) => d && form.setValue("expires_at", d, { shouldValidate: true })}
                  disabled={(d) => d <= new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            {form.formState.errors.expires_at && <p className="text-xs text-destructive">{form.formState.errors.expires_at.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea {...form.register("notes")} rows={3} placeholder="Notas opcionales..." />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creando..." : "Crear tenant"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
