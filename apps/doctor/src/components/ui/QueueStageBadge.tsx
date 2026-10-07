import { Badge } from "@curo/web/ui/badge";
import { cn } from "@/lib/utils";
import { statusClassName } from "@curo/web/ui/status-badge";
import type { QueueStage } from "@/types";
import { HeartPulse, Hourglass, Stethoscope, UserCheck } from "lucide-react";

// Doctor-facing view of where a checked-in patient is in the day's flow: the
// doctor's own wording, in the colours every portal uses for these stages.
// `done` and "not in the flow" render nothing — the appointment status covers those.
const STAGE_BADGES: Record<Exclude<QueueStage, "done">, { label: string; icon: typeof HeartPulse }> = {
  waiting_nurse: { label: "Awaiting triage", icon: Hourglass },
  with_nurse: { label: "With nurse", icon: HeartPulse },
  // Ready may mean triaged or sent straight through by reception — the visit editor shows whether vitals exist.
  ready_for_doctor: { label: "Ready to see", icon: UserCheck },
  with_doctor: { label: "In consultation", icon: Stethoscope },
};

export function QueueStageBadge({ stage, className }: { stage?: QueueStage | null; className?: string }) {
  if (!stage || stage === "done") return null;
  const { label, icon: Icon } = STAGE_BADGES[stage];
  return (
    <Badge variant="outline" className={cn(statusClassName(stage), className)}>
      <Icon /> {label}
    </Badge>
  );
}
