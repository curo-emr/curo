import { Badge } from "@curo/web/ui/badge";
import { toneClass } from "@curo/web/ui/status-badge";

interface ActiveBadgeProps {
  active: boolean;
  /** What "not active" is called here: "Suspended" for an account, "Inactive" for an organization. */
  inactiveLabel?: string;
}

/** Whether an account or an organization is in use. */
export function ActiveBadge({ active, inactiveLabel = "Suspended" }: ActiveBadgeProps) {
  return (
    <Badge variant="outline" className={toneClass(active ? "success" : "neutral")}>
      {active ? "Active" : inactiveLabel}
    </Badge>
  );
}
