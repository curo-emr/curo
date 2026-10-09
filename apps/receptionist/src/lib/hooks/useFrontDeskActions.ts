import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Appointment } from "@/types";
import { checkInPatient, completeVisit, sendToDoctor } from "@/lib/actions/checkin-actions";
import { invalidateAppointments } from "@/lib/queries";

type Action = (appointmentId: string) => Promise<{ success: boolean; error?: string }>;

// Queue actions shared by the dashboard and the queue board. Every queue, schedule
// and report refreshes after one, so the counts stay in step.
export function useFrontDeskActions() {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const run = async (appointment: Appointment, action: Action, done: string) => {
    setPendingId(appointment.id);
    const result = await action(appointment.id);
    setPendingId(null);
    if (result.success) toast.success(done);
    else toast.error(result.error || "Could not update the appointment. Refresh and try again.");
    void invalidateAppointments(queryClient);
  };

  return {
    pendingId,
    checkIn: (appointment: Appointment, patientName: string) =>
      run(appointment, checkInPatient, `${patientName} checked in, waiting for the nurse`),
    skipNurse: (appointment: Appointment, patientName: string) =>
      run(appointment, sendToDoctor, `${patientName} sent to the doctor without triage`),
    complete: (appointment: Appointment, patientName: string) =>
      run(appointment, completeVisit, `${patientName}'s visit marked complete`),
  };
}
