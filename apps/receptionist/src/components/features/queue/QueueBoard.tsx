"use client";

import type { Appointment, Patient, Doctor, QueueStage } from "@/types";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Badge } from "@curo/web/ui/badge";
import { Clock, Stethoscope, CheckCircle2, Loader2 } from "lucide-react";
import { FLOW_STAGES, STAGE_META, stageDotClass } from "@curo/web/flow";
import { toneClass, waitTone } from "@curo/web/ui/status-badge";
import { cn, getPatientName, getDoctorName, formatTime } from "@/lib/utils";
import { minutesInStage } from "@/lib/queue";
import { useFrontDeskActions } from "@/lib/hooks/useFrontDeskActions";

interface QueueBoardProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
}

const EMPTY: Record<QueueStage, string> = {
  waiting_nurse: "No one waiting for triage",
  with_nurse: "No one in triage",
  ready_for_doctor: "No one ready yet",
  with_doctor: "No consultations in progress",
  done: "No finished visits yet",
};

// Today's checked-in patients, one column per stage, in the same colours as every flow bar.
export function QueueBoard({ appointments, patients, doctors }: QueueBoardProps) {
  const { skipNurse, complete, pendingId } = useFrontDeskActions();

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
      {FLOW_STAGES.map(stage => {
        const meta = STAGE_META[stage];
        const items = appointments.filter(a => a.queueStage === stage);

        return (
          <section key={stage} className="min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className={cn("size-2 rounded-full", stageDotClass(meta))} />
                {meta.label}
              </h2>
              <Badge variant="secondary" className="font-mono tabular-nums">{items.length}</Badge>
            </div>

            {items.length === 0 ? (
              <Card className="border-dashed bg-transparent shadow-none">
                <CardContent className="p-5 text-center text-xs text-muted-foreground">{EMPTY[stage]}</CardContent>
              </Card>
            ) : (
              items.map(apt => {
                const minutes = minutesInStage(apt);
                const name = getPatientName(apt.patientId, patients);
                const pending = pendingId === apt.id;
                return (
                  <Card key={apt.id} className={cn("shadow-sm", stage === "done" && "opacity-75")}>
                    <CardContent className="space-y-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground" title={name}>{name}</p>
                        <p className="truncate text-xs text-muted-foreground">Dr. {getDoctorName(apt.doctorId, doctors)}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> {formatTime(apt.time)}
                        </span>
                        {stage !== "done" && (
                          <Badge
                            variant="outline"
                            title="Minutes at this stage"
                            className={cn("font-mono tabular-nums", toneClass(waitTone(minutes)))}
                          >
                            {minutes}m
                          </Badge>
                        )}
                      </div>

                      {stage === "waiting_nurse" && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => skipNurse(apt, name)} disabled={pending}>
                          {pending ? <Loader2 className="animate-spin" /> : <Stethoscope />}
                          Skip nurse, send to doctor
                        </Button>
                      )}
                      {stage === "with_doctor" && (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => complete(apt, name)} disabled={pending}>
                          {pending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                          Mark complete
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}
