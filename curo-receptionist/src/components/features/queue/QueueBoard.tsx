"use client";

import { useState, useEffect, useTransition } from "react";
import type { Appointment, Patient, Doctor, Visit } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  RefreshCw,
  Stethoscope,
  UserCheck,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import {
  cn,
  getPatientName,
  getDoctorName,
  calculateWaitTime,
  getStatusBorderClass,
  formatTime,
} from "@/lib/utils";
import { APPOINTMENT_STATUS } from "@/lib/constants";
import { sendToDoctor, completeVisit } from "@/lib/actions/checkin-actions";
import { toast } from "sonner";

interface QueueBoardProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  visits: Visit[];
}

export function QueueBoard({ appointments: initialAppointments, patients, doctors, visits }: QueueBoardProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [isPending, startTransition] = useTransition();
  const [, setTick] = useState(0);

  // Update wait times every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const waitingAppointments = appointments.filter(
    (a) =>
      a.status === APPOINTMENT_STATUS.ARRIVED ||
      a.status === APPOINTMENT_STATUS.WAITING
  );

  const inProgressAppointments = appointments.filter(
    (a) => a.status === APPOINTMENT_STATUS.IN_PROGRESS
  );

  const completedAppointments = appointments.filter(
    (a) => a.status === APPOINTMENT_STATUS.COMPLETED
  );

  const handleSendToDoctor = (appointmentId: string) => {
    startTransition(async () => {
      const result = await sendToDoctor(appointmentId);
      if (result.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, status: "in_progress" as const } : a
          )
        );
        toast.success("Patient sent to doctor");
      } else {
        toast.error(result.error || "Failed to send patient");
      }
    });
  };

  const handleCompleteVisit = (appointmentId: string) => {
    startTransition(async () => {
      const result = await completeVisit(appointmentId);
      if (result.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, status: "completed" as const } : a
          )
        );
        toast.success("Visit completed");
      } else {
        toast.error(result.error || "Failed to complete visit");
      }
    });
  };

  const getVisitForAppointment = (appointmentId: string) => {
    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt?.visitId) return null;
    return visits.find((v) => v.id === apt.visitId) || null;
  };

  const getDoctorRoom = (doctorId: string) => {
    const doc = doctors.find((d) => d.id === doctorId);
    return doc?.roomNumber || "";
  };

  return (
    <div className="space-y-6">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="text-muted-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Waiting Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-status-warning-text" />
              Waiting
            </h2>
            <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text">
              {waitingAppointments.length}
            </Badge>
          </div>
          {waitingAppointments.length === 0 ? (
            <Card className="shadow-sm border border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No patients waiting
              </CardContent>
            </Card>
          ) : (
            waitingAppointments.map((apt) => {
              const waitMinutes = apt.checkInTime ? calculateWaitTime(apt.checkInTime) : 0;
              return (
                <Card
                  key={apt.id}
                  className={cn(
                    "shadow-sm border transition-all hover:shadow-md",
                    getStatusBorderClass(apt.status)
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {getPatientName(apt.patientId, patients)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getDoctorName(apt.doctorId, doctors)}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          waitMinutes > 30
                            ? "bg-status-error-bg text-status-error-text"
                            : waitMinutes > 15
                            ? "bg-status-warning-bg text-status-warning-text"
                            : "bg-status-success-bg text-status-success-text"
                        )}
                      >
                        {waitMinutes}m
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {apt.checkInTime && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3 w-3" />
                          Checked in {formatTime(
                            new Date(apt.checkInTime).toTimeString().slice(0, 5)
                          )}
                        </span>
                      )}
                      {getDoctorRoom(apt.doctorId) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Room {getDoctorRoom(apt.doctorId)}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                      onClick={() => handleSendToDoctor(apt.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Stethoscope className="h-3 w-3 mr-1" />
                      )}
                      Send to Doctor
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* With Doctor Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              With Doctor
            </h2>
            <Badge variant="secondary" className="bg-primary/15 text-primary">
              {inProgressAppointments.length}
            </Badge>
          </div>
          {inProgressAppointments.length === 0 ? (
            <Card className="shadow-sm border border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No patients with doctor
              </CardContent>
            </Card>
          ) : (
            inProgressAppointments.map((apt) => {
              const visit = getVisitForAppointment(apt.id);
              return (
                <Card
                  key={apt.id}
                  className={cn(
                    "shadow-sm border transition-all hover:shadow-md",
                    getStatusBorderClass(apt.status)
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {getPatientName(apt.patientId, patients)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(apt.doctorId, doctors)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {visit?.checkInTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started{" "}
                          {formatTime(
                            new Date(visit.checkInTime).toTimeString().slice(0, 5)
                          )}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-status-success-border text-status-success-text hover:bg-status-success-bg"
                      onClick={() => handleCompleteVisit(apt.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Complete
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Completed Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-status-success-text" />
              Completed
            </h2>
            <Badge variant="secondary" className="bg-status-success-bg text-status-success-text">
              {completedAppointments.length}
            </Badge>
          </div>
          {completedAppointments.length === 0 ? (
            <Card className="shadow-sm border border-dashed">
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                No completed visits today
              </CardContent>
            </Card>
          ) : (
            completedAppointments.map((apt) => {
              const visit = getVisitForAppointment(apt.id);
              return (
                <Card
                  key={apt.id}
                  className={cn(
                    "shadow-sm border opacity-75",
                    getStatusBorderClass(apt.status)
                  )}
                >
                  <CardContent className="p-4 space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {getPatientName(apt.patientId, patients)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(apt.doctorId, doctors)}
                      </p>
                    </div>
                    {visit?.notes && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {visit.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
