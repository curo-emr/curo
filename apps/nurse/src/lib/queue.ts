import { toneDotClass, type Tone } from "@curo/web/ui/status-badge";
import { cn } from "@/lib/utils";
import type { QueueStage } from "@/types";
import type { QueueEntry } from "@/lib/hooks/useTodayQueue";

// Patient flow as the nurse station sees it (appointments.queueStage).

export const FLOW_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor", "with_doctor", "done"];

// The nurse's own work: waiting, in triage, and triaged but not yet seen (vitals still editable).
export const TRIAGE_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor"];

// Same tones as the doctor's Today, so a stage is one colour in both portals. Both
// nurse stages are the doctor's amber "With nurse"; waiting is faded, as not started yet.
export const STAGE_META: Record<QueueStage, { label: string; tone: Tone; faded?: boolean }> = {
  waiting_nurse: { label: "Waiting", tone: "warning", faded: true },
  with_nurse: { label: "In triage", tone: "warning" },
  ready_for_doctor: { label: "Ready for doctor", tone: "success" },
  with_doctor: { label: "With doctor", tone: "info" },
  done: { label: "Done", tone: "purple" },
};

/** A stage's legend dot. */
export const stageDotClass = (stage: QueueStage) =>
  cn(toneDotClass(STAGE_META[stage].tone), STAGE_META[stage].faded && "opacity-40");

// The patient the nurse should take now: anyone left mid-triage, else the first in the waiting room.
export function nextForTriage(entries: QueueEntry[]): QueueEntry | null {
  return (
    entries.find(e => e.appointment.queueStage === "with_nurse") ??
    entries.find(e => e.appointment.queueStage === "waiting_nurse") ??
    null
  );
}
