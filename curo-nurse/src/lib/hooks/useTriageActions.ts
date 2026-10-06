import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Appointment } from "@/types";
import { updateQueueStage } from "@/lib/api/appointments";
import { ROUTES } from "@/lib/constants";
import { apiErrorMessage } from "@/lib/api/client";

// Queue actions shared by the dashboard and the triage queue.
export function useTriageActions(onChange?: () => void) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const run = async (appointment: Appointment, action: () => Promise<void>) => {
    setPendingId(appointment.id);
    try {
      await action();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not update the queue. Refresh and try again."));
      onChange?.();
    } finally {
      setPendingId(null);
    }
  };

  // Claim the patient for triage (also re-opens triage for a patient already sent to the doctor).
  const openTriage = (appointment: Appointment) =>
    run(appointment, async () => {
      if (appointment.queueStage !== "with_nurse") await updateQueueStage(appointment.id, "with_nurse");
      router.push(ROUTES.TRIAGE(appointment.id));
    });

  const skipToDoctor = (appointment: Appointment, patientName: string) =>
    run(appointment, async () => {
      await updateQueueStage(appointment.id, "ready_for_doctor");
      toast.success(`${patientName} sent to the doctor without triage`);
      onChange?.();
    });

  return { openTriage, skipToDoctor, pendingId };
}
