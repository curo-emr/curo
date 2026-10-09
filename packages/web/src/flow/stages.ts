import { cn } from "cn";
import { toneDotClass, type Tone } from "../ui/tones";

/** Where a checked-in patient is in the day's flow (`appointments.queueStage`). */
export type QueueStage = "waiting_nurse" | "with_nurse" | "ready_for_doctor" | "with_doctor" | "done";

/** The stages in the order a patient goes through them. */
export const FLOW_STAGES: readonly QueueStage[] = ["waiting_nurse", "with_nurse", "ready_for_doctor", "with_doctor", "done"];

export interface StageStyle {
  label: string;
  tone: Tone;
  /** Drawn faintly, as not started yet. */
  faded?: boolean;
}

// One colour per stage in every portal. Both nurse stages share the doctor's amber
// "With nurse"; waiting is faded, as triage hasn't started.
export const STAGE_META: Record<QueueStage, StageStyle> = {
  waiting_nurse: { label: "Waiting for nurse", tone: "warning", faded: true },
  with_nurse: { label: "With nurse", tone: "warning" },
  ready_for_doctor: { label: "Ready for doctor", tone: "success" },
  with_doctor: { label: "With doctor", tone: "info" },
  done: { label: "Done", tone: "purple" },
};

/** Booked for today but not here yet: before the flow, so neutral and faded. */
export const NOT_ARRIVED: StageStyle = { label: "Not arrived", tone: "neutral", faded: true };

/** How many patients are at each stage. Anyone not in the flow (`null`) isn't counted. */
export function countStages(stages: readonly (QueueStage | null | undefined)[]): Record<QueueStage, number> {
  const counts = Object.fromEntries(FLOW_STAGES.map(stage => [stage, 0])) as Record<QueueStage, number>;
  for (const stage of stages) if (stage) counts[stage]++;
  return counts;
}

/** A stage's legend dot. */
export const stageDotClass = (style: StageStyle) => cn(toneDotClass(style.tone), style.faded && "opacity-40");
