"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./alert-dialog";

interface ConfirmActionProps {
  /** The button that asks, e.g. an outline "Suspend". */
  trigger: React.ReactNode;
  /** The question, e.g. "Suspend Chamali Silva?". */
  title: string;
  /** What going ahead does, and how to undo it. */
  description: React.ReactNode;
  /** The confirming button, e.g. "Suspend". */
  confirmLabel: string;
  /** For actions that take something away, such as access: a red confirm. */
  destructive?: boolean;
  onConfirm: () => void;
}

/** A button that asks before an action that's easy to click by mistake. */
export function ConfirmAction({ trigger, title, description, confirmLabel, destructive, onConfirm }: ConfirmActionProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
