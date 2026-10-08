import { formatStatus } from "../format";
import { Badge } from "./badge";
import { cn } from "cn";
import { TONES, type Tone } from "./tones";

export { toneClass, waitTone, type Tone } from "./tones";

interface StatusStyle {
  tone: Tone;
  /** Defaults to the status in sentence case: `not_arrived` → "Not arrived". */
  label?: string;
  /** For states that ended without happening, such as a cancelled appointment. */
  strikethrough?: boolean;
}

// One meaning per status in every portal. To add a status, add it here; to add a
// tone, add its tokens in styles.css first.
const STATUSES = {
  // Appointments and visits
  scheduled: { tone: "neutral" },
  not_arrived: { tone: "neutral" },
  arrived: { tone: "teal" },
  checked_in: { tone: "teal" },
  waiting: { tone: "warning" },
  in_progress: { tone: "info" },
  with_doctor: { tone: "info" },
  completed: { tone: "success" },
  cancelled: { tone: "neutral", strikethrough: true },
  no_show: { tone: "error" },
  // Where a checked-in patient is in the day's flow (with_doctor is above)
  waiting_nurse: { tone: "warning", label: "Waiting for nurse" },
  with_nurse: { tone: "teal" },
  ready_for_doctor: { tone: "success" },
  // Lab orders and prescriptions, as the ordering doctor sees them
  draft: { tone: "neutral" },
  sent_to_lab: { tone: "info" },
  sample_received: { tone: "teal" },
  results_pending: { tone: "warning", label: "Awaiting results" },
  results_ready: { tone: "success" },
  sent_to_pharmacy: { tone: "info" },
  // Lab samples and results
  received: { tone: "info" },
  collected: { tone: "teal" },
  processing: { tone: "info" },
  resulted: { tone: "purple" },
  verified: { tone: "success" },
  dispatched: { tone: "success" },
  rejected: { tone: "error" },
  // Lab quality control
  pass: { tone: "success" },
  fail: { tone: "error" },
  warning: { tone: "warning" },
  // Dispensing
  pending: { tone: "warning" },
  dispensed: { tone: "success" },
  partially_dispensed: { tone: "purple" },
  on_hold: { tone: "teal" },
  expired: { tone: "neutral" },
  // Stock levels and stock movements
  in_stock: { tone: "success" },
  low_stock: { tone: "warning" },
  out_of_stock: { tone: "error" },
  purchase: { tone: "success" },
  return: { tone: "teal" },
  adjustment: { tone: "warning" },
  damaged: { tone: "error" },
  // Payments that no longer count as income (pending is above)
  refunded: { tone: "neutral" },
  waived: { tone: "neutral" },
  // Problems and conditions
  active: { tone: "info" },
  resolved: { tone: "success" },
  inactive: { tone: "neutral" },
} satisfies Record<string, StatusStyle>;

export type Status = keyof typeof STATUSES;

// Data from the API can still hold a status this list doesn't know yet: show it, neutral.
const styleOf = (status: Status): StatusStyle => STATUSES[status] ?? { tone: "neutral" };

/** What a status reads as everywhere, e.g. "Awaiting results" for `results_pending`. */
export const statusLabel = (status: Status) => styleOf(status).label ?? formatStatus(status);

/** A status's colours, for a control that should look like its badge (such as a status picker). */
export function statusClassName(status: Status) {
  const style = styleOf(status);
  return cn(TONES[style.tone], style.strikethrough && "line-through");
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <Badge variant="outline" className={cn(statusClassName(status), className)}>
      {statusLabel(status)}
    </Badge>
  );
}
