import type { QueueStage } from "@/types";

// Patient flow as the nurse station sees it (appointments.queueStage).

export const QUEUE_POLL_MS = 15_000;

export const FLOW_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor", "with_doctor", "done"];

// The nurse's own work: waiting, in triage, and triaged but not yet seen (vitals still editable).
export const TRIAGE_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor"];

// `color` drives both the flow-strip segment and the legend dot.
export const STAGE_META: Record<QueueStage, { label: string; color: string }> = {
  waiting_nurse: { label: "Waiting", color: "bg-amber-400" },
  with_nurse: { label: "In triage", color: "bg-teal-500" },
  ready_for_doctor: { label: "Ready for doctor", color: "bg-emerald-500" },
  with_doctor: { label: "With doctor", color: "bg-primary" },
  done: { label: "Done", color: "bg-slate-300" },
};
