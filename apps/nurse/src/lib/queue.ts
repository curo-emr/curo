import type { QueueStage } from "@/types";
import type { QueueEntry } from "@/lib/hooks/useTodayQueue";

// Patient flow as the nurse station sees it (appointments.queueStage).

// The nurse's own work: waiting, in triage, and triaged but not yet seen (vitals still editable).
export const TRIAGE_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor"];

// The patient the nurse should take now: anyone left mid-triage, else the first in the waiting room.
export function nextForTriage(entries: QueueEntry[]): QueueEntry | null {
  return (
    entries.find(e => e.appointment.queueStage === "with_nurse") ??
    entries.find(e => e.appointment.queueStage === "waiting_nurse") ??
    null
  );
}
