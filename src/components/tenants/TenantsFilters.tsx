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
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Input
        placeholder="Buscar por email o nombre..."
        className="w-full sm:w-64"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="active">Activo</SelectItem>
          <SelectItem value="suspended">Suspendido</SelectItem>
          <SelectItem value="expired">Expirado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={planFilter} onValueChange={setPlanFilter}>
        <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Plan" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los planes</SelectItem>
          <SelectItem value="basic">Basic</SelectItem>
          <SelectItem value="pro">Pro</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
        </SelectContent>
      </Select>
      <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Onboarding" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo onboarding</SelectItem>
          <SelectItem value="done">Completado</SelectItem>
          <SelectItem value="in_progress">En progreso</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
        </SelectContent>
      </Select>
      <Select value={expiryFilter} onValueChange={setExpiryFilter}>
        <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Vencimiento" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier vencimiento</SelectItem>
          <SelectItem value="7">Vence en ≤ 7 días</SelectItem>
          <SelectItem value="30">Vence en ≤ 30 días</SelectItem>
          <SelectItem value="safe">Más de 30 días</SelectItem>
          <SelectItem value="expired">Ya vencidos</SelectItem>
        </SelectContent>
      </Select>
      <div className="hidden sm:block sm:flex-1" />
      <Button onClick={onCreate} className="w-full sm:w-auto">
        <Plus className="mr-1.5 h-4 w-4" />Nuevo tenant
      </Button>
    </div>
  );
}
