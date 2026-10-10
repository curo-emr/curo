"use client";

import { ShieldAlert } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle,
} from "./alert-dialog";
import { describeAllergyAlert, type AllergyAlert } from "../clinical/allergy-check";

interface AllergyConfirmDialogProps {
  /** The drug being prescribed or dispensed; the dialog is open while this is set. */
  drugName: string | null;
  alerts: AllergyAlert[];
  /** What going ahead does, e.g. "Prescribe anyway". */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before going ahead with a drug the patient may be allergic to. It never blocks. */
export function AllergyConfirmDialog({ drugName, alerts, confirmLabel, onConfirm, onCancel }: AllergyConfirmDialogProps) {
  return (
    <AlertDialog open={drugName !== null} onOpenChange={open => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-status-error-bg text-status-error-text"><ShieldAlert /></AlertDialogMedia>
          <AlertDialogTitle>Possible allergy to {drugName}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-1.5">
              {alerts.map(alert => <p key={alert.allergy.id}>{describeAllergyAlert(alert, drugName ?? "")}</p>)}
              <p>Check with the patient before going ahead.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
