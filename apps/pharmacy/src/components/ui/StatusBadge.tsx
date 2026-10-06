import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatStatus } from "@/lib/utils";

type PrescriptionStatusType = 'pending' | 'processing' | 'dispensed' | 'partially_dispensed' | 'on_hold' | 'cancelled' | 'expired';
type StockStatusType = 'in_stock' | 'low_stock' | 'out_of_stock';
type TransactionType = 'purchase' | 'dispensed' | 'return' | 'adjustment' | 'expired' | 'damaged';
type StatusType = PrescriptionStatusType | StockStatusType | TransactionType | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<string, { label?: string; classes: string }> = {
  pending:              { classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  processing:           { classes: "bg-status-info-bg text-status-info-text border-status-info-border" },
  dispensed:            { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  partially_dispensed:  { label: "Partially Dispensed", classes: "bg-status-purple-bg text-status-purple-text border-status-purple-border" },
  on_hold:              { label: "On Hold", classes: "bg-status-teal-bg text-status-teal-text border-status-teal-border" },
  cancelled:            { classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
  expired:              { classes: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border" },
  in_stock:             { label: "In Stock", classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  low_stock:            { label: "Low Stock", classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  out_of_stock:         { label: "Out of Stock", classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
  purchase:             { classes: "bg-status-success-bg text-status-success-text border-status-success-border" },
  return:               { classes: "bg-status-teal-bg text-status-teal-text border-status-teal-border" },
  adjustment:           { classes: "bg-status-warning-bg text-status-warning-text border-status-warning-border" },
  damaged:              { classes: "bg-status-error-bg text-status-error-text border-status-error-border" },
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
