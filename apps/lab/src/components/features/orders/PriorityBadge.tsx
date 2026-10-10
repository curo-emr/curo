import { Badge } from "@curo/web/ui/badge";
import { toneClass } from "@curo/web/ui/status-badge";
import { cn } from "@/lib/utils";
import { PRIORITY_META } from "@/lib/orders";
import type { LabOrder } from "@/types";

export function PriorityBadge({ priority, className }: { priority: LabOrder["priority"]; className?: string }) {
  const { label, tone } = PRIORITY_META[priority];
  return <Badge variant="outline" className={cn(toneClass(tone), className)}>{label}</Badge>;
}
