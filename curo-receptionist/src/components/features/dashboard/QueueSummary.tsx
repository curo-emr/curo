import { Clock, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPatientName, getDoctorName, calculateWaitTime } from "@/lib/utils";
import { APPOINTMENT_STATUS } from "@/lib/constants";
import type { Appointment, Patient, Doctor } from "@/types";

interface QueueSummaryProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
}

export function QueueSummary({ appointments, patients, doctors }: QueueSummaryProps) {
  const waitingAppointments = appointments.filter(
    (a) =>
      a.status === APPOINTMENT_STATUS.ARRIVED ||
      a.status === APPOINTMENT_STATUS.WAITING
  );

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-muted/50 border-b pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-status-warning-text" />
            Queue Summary
          </CardTitle>
          {waitingAppointments.length > 0 && (
            <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg">
              {waitingAppointments.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {waitingAppointments.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No patients waiting
            </div>
          ) : (
            waitingAppointments.map((apt) => {
              const waitMinutes = apt.checkInTime
                ? calculateWaitTime(apt.checkInTime)
                : 0;

              return (
                <div
                  key={apt.id}
                  className="p-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-foreground">
                      {getPatientName(apt.patientId, patients)}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        waitMinutes >= 30
                          ? "bg-status-error-bg text-status-error-text border-status-error-border"
                          : waitMinutes >= 15
                            ? "bg-status-warning-bg text-status-warning-text border-status-warning-border"
                            : "bg-muted text-muted-foreground border"
                      }
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {waitMinutes} min
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Dr. {getDoctorName(apt.doctorId, doctors)} &bull; {apt.visitType}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
