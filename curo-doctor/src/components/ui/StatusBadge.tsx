import { Badge } from "@/components/ui/badge";
import { formatStatus } from "@/lib/utils";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
type EncounterStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type StatusType = AppointmentStatus | EncounterStatus | string;

interface StatusBadgeProps {
  status: StatusType;
}

/**
 * Single source of truth for appointment/encounter status badge styling.
 * Replaces duplicated getStatusBadge() logic across 4+ files.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'waiting':
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
          Waiting
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
          In Progress
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
          Completed
        </Badge>
      );
    case 'scheduled':
      return (
        <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">
          Scheduled
        </Badge>
      );
    case 'not_arrived':
      return (
        <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">
          Not Arrived
        </Badge>
      );
    case 'arrived':
      return (
        <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">
          Arrived
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-100 line-through">
          Cancelled
        </Badge>
      );
    case 'no_show':
      return (
        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
          No Show
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-slate-600 border-slate-200">
          {formatStatus(status)}
        </Badge>
      );
  }
}
