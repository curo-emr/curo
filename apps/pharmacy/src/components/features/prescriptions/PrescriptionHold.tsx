"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { apiErrorMessage } from "@curo/web/api";
import { Button } from "@curo/web/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@curo/web/ui/dialog";
import { Field, FieldError, FieldLabel } from "@curo/web/ui/field";
import { Textarea } from "@curo/web/ui/textarea";
import { toneClass } from "@curo/web/ui/status-badge";
import { holdPrescription, releasePrescription } from "@/lib/api/pharmacy";
import { medicineName } from "@/lib/prescriptions";
import { invalidateAfterHold } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { Prescription } from "@/types";

/** Sets a waiting prescription aside, with why, so the next patient can be served meanwhile. */
export function HoldPrescriptionDialog({ prescription }: { prescription: Prescription }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const hold = useMutation({
    mutationFn: () => holdPrescription(prescription.id, reason.trim()),
    onSuccess: () => {
      toast.success(`${medicineName(prescription)} is on hold`, {
        description: "It's listed under On hold on the Prescriptions page.",
      });
      setOpen(false);
      setReason("");
      return invalidateAfterHold(queryClient, prescription.patientId);
    },
  });

  return (
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) hold.reset(); }}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline"><PauseCircle />Put on hold</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={e => { e.preventDefault(); hold.mutate(); }} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Put {medicineName(prescription)} on hold</DialogTitle>
            <DialogDescription>
              It leaves the waiting list until you release it. The doctor who prescribed it is sent your reason.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="hold-reason">Reason</FieldLabel>
            <Textarea
              id="hold-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Out of stock until Friday, or a question about the dose"
              maxLength={500}
              autoFocus
            />
            {hold.isError && <FieldError>{apiErrorMessage(hold.error, "The prescription couldn't be put on hold.")}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={hold.isPending}>Cancel</Button>
            <Button type="submit" disabled={!reason.trim() || hold.isPending}>
              {hold.isPending && <Loader2 className="animate-spin" />}
              Put on hold
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Why a prescription is on hold, and the way back to the waiting list. */
export function HeldNotice({ prescription }: { prescription: Prescription }) {
  const queryClient = useQueryClient();
  const release = useMutation({
    mutationFn: () => releasePrescription(prescription.id),
    onSuccess: () => {
      toast.success(`${medicineName(prescription)} is waiting again`);
      return invalidateAfterHold(queryClient, prescription.patientId);
    },
  });

  return (
    <div className="space-y-3">
      <p className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", toneClass("warning"))}>
        <PauseCircle className="mt-0.5 size-4 shrink-0" />
        <span>On hold: {prescription.holdReason || "no reason given"}</span>
      </p>
      <Button size="lg" variant="outline" onClick={() => release.mutate()} disabled={release.isPending}>
        {release.isPending ? <Loader2 className="animate-spin" /> : <PlayCircle />}
        Release to the waiting list
      </Button>
      {release.isError && (
        <p className="text-sm text-status-error-text">{apiErrorMessage(release.error, "The prescription couldn't be released.")}</p>
      )}
    </div>
  );
}
