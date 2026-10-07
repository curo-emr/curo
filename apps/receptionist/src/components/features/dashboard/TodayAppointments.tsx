"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { QueueStageBadge } from "@/components/ui/QueueStageBadge";
import { checkInPatient, sendToDoctor, completeVisit } from "@/lib/actions/checkin-actions";
import { getPatientName, getPatientMeta, getDoctorName, formatTime } from "@/lib/utils";
import { ROUTES, APPOINTMENT_STATUS } from "@/lib/constants";
import type { Appointment, Patient, Doctor } from "@/types";

interface TodayAppointmentsProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  onChange: () => void;
}

export function TodayAppointments({ appointments, patients, doctors, onChange }: TodayAppointmentsProps) {
  const [isPending, startTransition] = useTransition();

  // Run a check-in action, report it, and let the page re-fetch so stats and the queue summary stay in sync.
  function runAction(
    action: (appointmentId: string) => Promise<{ success: boolean; error?: string }>,
    appointmentId: string,
    successMessage: string,
    failureMessage: string,
  ) {
    startTransition(async () => {
      const result = await action(appointmentId);
      if (result.success) {
        toast.success(successMessage);
        onChange();
      } else {
        toast.error(result.error || failureMessage);
      }
    });
  }

  const handleCheckIn = (id: string) =>
    runAction(checkInPatient, id, "Patient checked in — waiting for nurse triage", "Failed to check in patient");
  const handleSendToDoctor = (id: string) =>
    runAction(sendToDoctor, id, "Patient sent directly to the doctor", "Failed to send patient to doctor");
  const handleComplete = (id: string) =>
    runAction(completeVisit, id, "Visit completed", "Failed to complete visit");

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Today&apos;s Schedule
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
            {appointments.length} Appointment{appointments.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {appointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No appointments scheduled for today.
            </div>
          ) : (
            appointments.map((apt) => {
              const patientMeta = getPatientMeta(apt.patientId, patients);
              const canCheckIn =
                apt.status === APPOINTMENT_STATUS.SCHEDULED ||
                apt.status === APPOINTMENT_STATUS.NOT_ARRIVED;
              const canSendToDoctor = apt.queueStage === "waiting_nurse";
              const canComplete = apt.queueStage === "with_doctor";

              return (
                <div
                  key={apt.id}
                  className="p-4 hover:bg-muted transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-muted text-foreground">
                      <span className="text-sm font-semibold">{formatTime(apt.time)}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link
                          href={ROUTES.PATIENT(apt.patientId)}
                          className="font-semibold text-base text-foreground hover:text-primary transition-colors"
                        >
                          {getPatientName(apt.patientId, patients)}
                        </Link>
                        <StatusBadge status={apt.status} />
                        <QueueStageBadge stage={apt.queueStage} />
                      </div>
                      <div className="text-sm text-muted-foreground mb-1">
                        <span className="font-medium text-muted-foreground">
                          {getDoctorName(apt.doctorId, doctors)}
                        </span>
                        {" | "}
                        {apt.visitType}
                        {apt.reason && <> &mdash; {apt.reason}</>}
                      </div>
                      {patientMeta && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {patientMeta.age}y &bull;{" "}
                          {patientMeta.sex.charAt(0).toUpperCase() + patientMeta.sex.slice(1)}
                          {apt.room && <> &bull; Room {apt.room}</>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {canCheckIn && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-status-teal-text hover:bg-status-teal-text/90"
                        onClick={() => handleCheckIn(apt.id)}
                        disabled={isPending}
                      >
                        Check In
                      </Button>
                    )}
                    {canSendToDoctor && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-primary hover:bg-primary/90"
                        onClick={() => handleSendToDoctor(apt.id)}
                        disabled={isPending}
                      >
                        Skip Nurse
                      </Button>
                    )}
                    {canComplete && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-status-success-text hover:bg-status-success-text/90"
                        onClick={() => handleComplete(apt.id)}
                        disabled={isPending}
                      >
                        Complete
                      </Button>
                    )}
                    <Link href={ROUTES.PATIENT(apt.patientId)}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        View
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
