import RenewDialog from "@/components/tenants/RenewDialog";
import SuspendDialog from "@/components/tenants/SuspendDialog";
import ChangePlanDialog from "@/components/tenants/ChangePlanDialog";
import AdjustCreditsDialog from "@/components/tenants/AdjustCreditsDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tenant, TenantPlan } from "@/types/tenant";
import type { useTenantActions } from "@/hooks/useTenantActions";
import type { TenantDialogType } from "@/components/tenants/TenantActionsMenu";

export type TenantDialogState =
  | { type: TenantDialogType; tenant: Tenant }
  | null;

interface Props {
  dialog: TenantDialogState;
  setDialog: (d: TenantDialogState) => void;
  actions: ReturnType<typeof useTenantActions>;
}

export default function TenantActionDialogs({ dialog, setDialog, actions }: Props) {
  return (
    <>
      {dialog?.type === "renew" && (
        <RenewDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          currentExpiresAt={dialog.tenant.expires_at}
          busy={actions.busy}
          onConfirm={(v) => actions.renew(dialog.tenant.id, dialog.tenant.expires_at, v)}
        />
      )}
      {dialog?.type === "suspend" && (
        <SuspendDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          busy={actions.busy}
          onConfirm={(reason) => actions.suspend(dialog.tenant.id, reason)}
        />
      )}
      {dialog?.type === "plan" && (
        <ChangePlanDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          currentPlan={dialog.tenant.plan as TenantPlan}
          busy={actions.busy}
          onConfirm={(p) => actions.updatePlan(dialog.tenant.id, p, dialog.tenant.plan as TenantPlan)}
        />
      )}
      {dialog?.type === "credits" && (
        <AdjustCreditsDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          currentCredits={dialog.tenant.credits_assigned}
          busy={actions.busy}
          onConfirm={(delta, mode) => actions.adjustCredits(dialog.tenant.id, delta, mode, dialog.tenant.credits_assigned)}
        />
      )}

      <AlertDialog
        open={dialog?.type === "reactivate" || dialog?.type === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.type === "delete" ? "¿Eliminar tenant?" : "¿Reactivar tenant?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.type === "delete"
                ? "Esto eliminará permanentemente el tenant, sus eventos y el usuario de autenticación. Esta acción no se puede deshacer."
                : "El tenant volverá a tener acceso a su panel."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!dialog) return;
                if (dialog.type === "delete") await actions.remove(dialog.tenant.id);
                else if (dialog.type === "reactivate") await actions.reactivate(dialog.tenant.id);
                setDialog(null);
              }}
              className={dialog?.type === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            >
              {dialog?.type === "delete" ? "Eliminar" : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
