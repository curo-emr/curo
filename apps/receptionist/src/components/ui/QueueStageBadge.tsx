import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QueueStage } from "@/types";

// Where a checked-in patient is in the day's flow. `done` / not in the flow
// render nothing — the appointment status badge covers those.
const STAGE_BADGES: Partial<Record<QueueStage, { label: string; classes: string }>> = {
  waiting_nurse: { label: "Waiting for nurse", classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  with_nurse: { label: "With nurse", classes: "bg-status-teal-bg text-status-teal-text border-status-teal-border" },
  ready_for_doctor: { label: "Ready for doctor", classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  with_doctor: { label: "With doctor", classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
};

export function QueueStageBadge({ stage, className }: { stage?: QueueStage | null; className?: string }) {
  const config = stage ? STAGE_BADGES[stage] : undefined;
  if (!config) return null;
  return (
    <Badge variant="outline" className={cn(config.classes, className)}>
      {config.label}
    </Badge>
  );
}
