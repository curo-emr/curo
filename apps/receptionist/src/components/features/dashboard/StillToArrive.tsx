import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@curo/web/ui/button";
import { LateBadge } from "./LateBadge";
import { ROUTES } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { Arrival } from "@/lib/queue";

interface Props {
  arrivals: Arrival[];
  pendingId: string | null;
  onCheckIn: (arrival: Arrival) => void;
}

// Everyone else booked for today who hasn't arrived, in appointment order, so a
// patient who walks in early or late can be checked in from here too.
export function StillToArrive({ arrivals, pendingId, onCheckIn }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
        <p className="text-muted-foreground">
          {arrivals.length === 0 ? (
            "No one else is booked for today."
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">{arrivals.length}</span> more to arrive today
            </>
          )}
        </p>
        <Link href={ROUTES.QUEUE} className="inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline">
          Open queue board <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {arrivals.length > 0 && (
        <ul className="divide-y border-t">
          {arrivals.map(arrival => {
            const { appointment } = arrival;
            const pending = pendingId === appointment.id;
            return (
              <li key={appointment.id} className="flex items-center gap-4 px-6 py-3">
                <span className="w-16 shrink-0 text-sm font-medium tabular-nums text-foreground">{formatTime(appointment.time)}</span>
                <div className="min-w-0 flex-1">
                  <Link href={ROUTES.PATIENT(appointment.patientId)} className="block truncate font-medium text-foreground hover:text-primary">
                    {arrival.patientName}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">Dr. {arrival.doctorName}</p>
                </div>
                <LateBadge time={appointment.time} />
                <Button variant="outline" size="sm" onClick={() => onCheckIn(arrival)} disabled={pending} className="shrink-0">
                  {pending && <Loader2 className="animate-spin" />}
                  Check in
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
