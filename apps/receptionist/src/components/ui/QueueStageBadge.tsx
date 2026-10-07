import { StatusBadge } from "@curo/web/ui/status-badge";
import type { QueueStage } from "@/types";

// Where a checked-in patient is in the day's flow. `done` / not in the flow
// render nothing — the appointment status badge covers those.
export function QueueStageBadge({ stage, className }: { stage?: QueueStage | null; className?: string }) {
  if (!stage || stage === "done") return null;
  return <StatusBadge status={stage} className={className} />;
}
