import { Badge } from "@curo/web/ui/badge";
import { cn } from "@/lib/utils";
import { formatStatus } from "@/lib/utils";

type LabStatus = 'received' | 'collected' | 'processing' | 'resulted' | 'verified' | 'dispatched' | 'rejected';
type QCStatusType = 'pass' | 'fail' | 'warning';
type StatusType = LabStatus | QCStatusType | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

/**
 * Status-to-semantic-color mapping for lab workflows.
 * Uses CSS variable triplets from the design system (globals.css):
 *   bg-status-<category>-bg  text-status-<category>-text  border-status-<category>-border
 *
 * To add a new status: add an entry here mapping to a semantic category.
 * To add a new semantic category: add tokens in globals.css first.
 */
const statusStyles: Record<string, { label?: string; classes: string }> = {
  received:   { classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  collected:  { classes: "bg-status-teal-bg text-status-teal-text border-status-teal-border" },
  processing: { classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  resulted:   { classes: "bg-status-purple-bg text-status-purple-text border-status-purple-border" },
  verified:   { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  dispatched: { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  rejected:   { classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
  pass:       { label: "Pass", classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  fail:       { label: "Fail", classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
  warning:    { label: "Warning", classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
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
    <Badge variant="outline" className={cn(config.classes, className)}>
      {config.label ?? formatStatus(status)}
    </Badge>
  );
}
