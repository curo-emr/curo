import { Badge } from "@curo/web/ui/badge";
import { toneClass } from "@curo/web/ui/status-badge";
import { minutesLate } from "@/lib/queue";
import { cn } from "@/lib/utils";

// How late a patient who hasn't arrived is; nothing while they aren't due yet.
export function LateBadge({ time }: { time: string }) {
  const late = minutesLate(time);
  if (late === 0) return null;
  return (
    <Badge variant="outline" className={cn("font-mono tabular-nums", toneClass("warning"))}>
      {late < 60 ? `${late}m late` : `${Math.floor(late / 60)}h ${late % 60}m late`}
    </Badge>
  );
}
