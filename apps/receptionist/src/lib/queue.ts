import type { Appointment, QueueStage } from "@/types";
import { calculateWaitTime } from "@/lib/utils";

// Patient-flow queue (appointments.queueStage) — shared by the dashboard and the queue board.

export const QUEUE_POLL_MS = 15_000;

export const QUEUE_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor", "with_doctor", "done"];

// Checked in but not yet seen by the doctor.
export const PRE_DOCTOR_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor"];

export const isAwaitingDoctor = (a: Appointment) => !!a.queueStage && PRE_DOCTOR_STAGES.includes(a.queueStage);

export const minutesInStage = (a: Appointment) => (a.stageSince ? calculateWaitTime(a.stageSince) : 0);

export function waitBadgeClass(minutes: number): string {
  if (minutes > 30) return "bg-status-error-bg text-status-error-text border-status-error-border";
  if (minutes > 15) return "bg-status-warning-bg text-status-warning-text border-status-warning-border";
  return "bg-status-success-bg text-status-success-text border-status-success-border";
}
