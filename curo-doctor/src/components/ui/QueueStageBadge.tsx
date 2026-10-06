import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QueueStage } from "@/types";
import { HeartPulse, Hourglass, Stethoscope, UserCheck } from "lucide-react";

// Doctor-facing view of where a checked-in patient is in the day's flow.
// `done` and "not in the flow" render nothing — the appointment status covers those.
const STAGE_BADGES: Partial<Record<QueueStage, { label: string; icon: typeof HeartPulse; classes: string }>> = {
  waiting_nurse: { label: "Awaiting triage", icon: Hourglass, classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  with_nurse: { label: "With nurse", icon: HeartPulse, classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  // Ready may mean triaged or sent straight through by reception — the visit editor shows whether vitals exist.
  ready_for_doctor: { label: "Ready to see", icon: UserCheck, classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  with_doctor: { label: "In consultation", icon: Stethoscope, classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
};

export function QueueStageBadge({ stage, className }: { stage?: QueueStage | null; className?: string }) {
  const config = stage ? STAGE_BADGES[stage] : undefined;
  if (!config) return null;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn(config.classes, className)}>
      <Icon /> {config.label}
    </Badge>
  );
}
