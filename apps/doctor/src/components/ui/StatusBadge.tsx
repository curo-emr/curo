import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatStatus } from "@/lib/utils";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type EncounterStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type StatusType = AppointmentStatus | EncounterStatus | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

/**
 * Status-to-semantic-color mapping.
 * Uses CSS variable triplets from the design system (globals.css):
 *   bg-status-<category>-bg  text-status-<category>-text  border-status-<category>-border
 *
 * To add a new status: add an entry here mapping to a semantic category.
 * To add a new semantic category: add tokens in globals.css first.
 */
const statusStyles: Record<string, { label?: string; classes: string; strikethrough?: boolean }> = {
  waiting:      { classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  in_progress:  { classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  completed:    { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  scheduled:    { classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border" },
  not_arrived:  { label: "Not Arrived", classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border" },
  arrived:      { classes: "bg-status-teal-bg text-status-teal-text border-status-teal-border" },
  cancelled:    { classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border", strikethrough: true },
  no_show:      { label: "No Show", classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
  // Lab orders & prescriptions
  draft:            { classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border" },
  sent_to_lab:      { label: "Sent to lab", classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  results_pending:  { label: "Awaiting results", classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  sent_to_pharmacy: { label: "Sent to pharmacy", classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  // Problems
  active:   { classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  resolved: { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  inactive: { classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusStyles[status];

  if (!config) {
    return (
      <Badge variant="outline" className={cn("bg-status-neutral-bg text-status-neutral-text border-status-neutral-border", className)}>
        {formatStatus(status)}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(config.classes, config.strikethrough && "line-through", className)}
    >
      {config.label ?? formatStatus(status)}
    </Badge>
  );
}
