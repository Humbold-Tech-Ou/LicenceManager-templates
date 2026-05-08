import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Props {
  searchInput: string;
  setSearchInput: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  planFilter: string;
  setPlanFilter: (v: string) => void;
  onboardingFilter: string;
  setOnboardingFilter: (v: string) => void;
  expiryFilter: string;
  setExpiryFilter: (v: string) => void;
  onCreate: () => void;
}

export default function TenantsFilters({
  searchInput, setSearchInput,
  statusFilter, setStatusFilter,
  planFilter, setPlanFilter,
  onboardingFilter, setOnboardingFilter,
  expiryFilter, setExpiryFilter,
  onCreate,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-2 sm:gap-3">
      <div className="flex flex-col gap-1 w-full sm:w-64">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Buscar</span>
        <Input
          placeholder="Email o nombre..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-36">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Estado</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="suspended">Suspendido</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-36">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Plan</span>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-40">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Onboarding</span>
        <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
          <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo onboarding</SelectItem>
            <SelectItem value="done">Completado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 w-full sm:w-44">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Vencimiento</span>
        <Select value={expiryFilter} onValueChange={setExpiryFilter}>
          <SelectTrigger><SelectValue placeholder="Cualquiera" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier vencimiento</SelectItem>
            <SelectItem value="7">Vence en ≤ 7 días</SelectItem>
            <SelectItem value="30">Vence en ≤ 30 días</SelectItem>
            <SelectItem value="safe">Más de 30 días</SelectItem>
            <SelectItem value="expired">Ya vencidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden sm:block sm:flex-1" />
      <Button onClick={onCreate} className="w-full sm:w-auto">
        <Plus className="mr-1.5 h-4 w-4" />Nuevo tenant
      </Button>
    </div>
  );
}
