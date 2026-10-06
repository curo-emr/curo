"use client";

import { useTransition } from "react";
import type { Appointment, Patient, Doctor, QueueStage } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Stethoscope,
  HeartPulse,
  ClipboardCheck,
  CheckCircle2,
  Hourglass,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn, getPatientName, getDoctorName, formatTime } from "@/lib/utils";
import { QUEUE_STAGES, minutesInStage, waitBadgeClass } from "@/lib/queue";
import { sendToDoctor, completeVisit } from "@/lib/actions/checkin-actions";
import { toast } from "sonner";

interface QueueBoardProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  onChange: () => void; // re-fetch after an action
}

const COLUMNS: Record<QueueStage, { title: string; icon: LucideIcon; accent: string; count: string; border: string; empty: string }> = {
  waiting_nurse: {
    title: "Waiting for Nurse", icon: Hourglass, accent: "text-status-warning-text",
    count: "bg-status-warning-bg text-status-warning-text", border: "border-l-status-warning-text",
    empty: "No one waiting for triage",
  },
  with_nurse: {
    title: "With Nurse", icon: HeartPulse, accent: "text-status-teal-text",
    count: "bg-status-teal-bg text-status-teal-text", border: "border-l-status-teal-text",
    empty: "No one in triage",
  },
  ready_for_doctor: {
    title: "Ready for Doctor", icon: ClipboardCheck, accent: "text-status-success-text",
    count: "bg-status-success-bg text-status-success-text", border: "border-l-status-success-text",
    empty: "No one ready yet",
  },
  with_doctor: {
    title: "With Doctor", icon: Stethoscope, accent: "text-primary",
    count: "bg-primary/15 text-primary", border: "border-l-primary",
    empty: "No consultations in progress",
  },
  done: {
    title: "Done", icon: CheckCircle2, accent: "text-muted-foreground",
    count: "bg-muted text-muted-foreground", border: "border-l-border",
    empty: "No completed visits today",
  },
};

export function QueueBoard({ appointments, patients, doctors, onChange }: QueueBoardProps) {
  const [isPending, startTransition] = useTransition();

  const runAction = (
    action: (id: string) => Promise<{ success: boolean; error?: string }>,
    appointmentId: string,
    successMessage: string,
  ) => {
    startTransition(async () => {
      const result = await action(appointmentId);
      if (result.success) {
        toast.success(successMessage);
        onChange();
      } else {
        toast.error(result.error || "Action failed");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
      {QUEUE_STAGES.map((stage) => {
        const column = COLUMNS[stage];
        const Icon = column.icon;
        const items = appointments.filter((a) => a.queueStage === stage);

        return (
          <section key={stage} className="space-y-3 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Icon className={cn("h-4 w-4", column.accent)} />
                {column.title}
              </h2>
              <Badge variant="secondary" className={column.count}>
                {items.length}
              </Badge>
            </div>

            {items.length === 0 ? (
              <Card className="shadow-none border border-dashed bg-transparent">
                <CardContent className="p-5 text-center text-muted-foreground text-xs">
                  {column.empty}
                </CardContent>
              </Card>
            ) : (
              items.map((apt) => {
                const minutes = minutesInStage(apt);
                return (
                  <Card
                    key={apt.id}
                    className={cn(
                      "shadow-sm border border-l-4 transition-all hover:shadow-md",
                      column.border,
                      stage === "done" && "opacity-75",
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {getPatientName(apt.patientId, patients)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {getDoctorName(apt.doctorId, doctors)}
                          </p>
                        </div>
                        {stage !== "done" && (
                          <Badge variant="outline" className={cn("text-xs shrink-0", waitBadgeClass(minutes))}>
                            {minutes}m
                          </Badge>
                        )}
                      </div>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Appointment {formatTime(apt.time)}
                      </p>

                      {stage === "waiting_nurse" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => runAction(sendToDoctor, apt.id, "Patient sent directly to the doctor")}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Stethoscope className="h-3 w-3" />}
                          Skip nurse — send to doctor
                        </Button>
                      )}
                      {stage === "with_doctor" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-status-success-border text-status-success-text hover:bg-status-success-bg"
                          onClick={() => runAction(completeVisit, apt.id, "Visit completed")}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
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
