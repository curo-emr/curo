import type { QueueStage } from "@/types";

// Patient flow as the nurse station sees it (appointments.queueStage).

export const QUEUE_POLL_MS = 15_000;

export const FLOW_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor", "with_doctor", "done"];

// The nurse's own work: waiting, in triage, and triaged but not yet seen (vitals still editable).
export const TRIAGE_STAGES: QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor"];

export const STAGE_META: Record<QueueStage, { label: string; bar: string; dot: string }> = {
  waiting_nurse: { label: "Waiting", bar: "bg-status-warning-text", dot: "bg-status-warning-text" },
  with_nurse: { label: "In triage", bar: "bg-status-teal-text", dot: "bg-status-teal-text" },
  ready_for_doctor: { label: "Ready for doctor", bar: "bg-status-success-text", dot: "bg-status-success-text" },
  with_doctor: { label: "With doctor", bar: "bg-primary", dot: "bg-primary" },
  done: { label: "Done", bar: "bg-status-neutral-border", dot: "bg-status-neutral-text" },
};

// Minutes a patient has been waiting → badge colour (green → amber after 15m → red after 30m).
export function waitBadgeClass(minutes: number): string {
  if (minutes > 30) return "bg-status-error-bg text-status-error-text border-status-error-border";
  if (minutes > 15) return "bg-status-warning-bg text-status-warning-text border-status-warning-border";
  return "bg-status-success-bg text-status-success-text border-status-success-border";
}
