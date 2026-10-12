"use client";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "./alert-dialog";

interface ConfirmActionProps {
  /** The button that asks, e.g. an outline "Suspend". Leave it out to open the dialog with `open`. */
  trigger?: React.ReactNode;
  /** For a dialog opened by something other than a button, such as a menu choice. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The question, e.g. "Suspend Chamali Silva?". */
  title: string;
  /** What going ahead does, and how to undo it. */
  description: React.ReactNode;
  /** The confirming button, e.g. "Suspend". */
  confirmLabel: string;
  /** The button that backs out, when "Cancel" would read as the action, e.g. "Keep appointment". */
  cancelLabel?: string;
  /** For actions that take something away, such as access: a red confirm. */
  destructive?: boolean;
  onConfirm: () => void;
}

/** A button that asks before an action that's easy to click by mistake. */
export function ConfirmAction({
  trigger, open, onOpenChange, title, description, confirmLabel, cancelLabel = "Cancel", destructive, onConfirm,
}: ConfirmActionProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
