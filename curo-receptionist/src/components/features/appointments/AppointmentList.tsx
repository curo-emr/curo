"use client";

import { useState, useMemo, useTransition } from "react";
import type { Appointment, Patient, Doctor } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import {
  getPatientName,
  getDoctorName,
  formatDate,
  formatTime,
  getTodayString,
} from "@/lib/utils";
import { APPOINTMENT_STATUS, ROUTES } from "@/lib/constants";
import { checkInPatient } from "@/lib/actions/checkin-actions";
import { cancelAppointment } from "@/lib/actions/appointment-actions";
import { toast } from "sonner";

interface AppointmentListProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
}

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Arrived", value: "arrived" },
  { label: "Waiting", value: "waiting" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "no_show" },
];

export function AppointmentList({ appointments: initialAppointments, patients, doctors }: AppointmentListProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => {
        const matchesDate = !dateFilter || a.date === dateFilter;
        const matchesDoctor = doctorFilter === "all" || a.doctorId === doctorFilter;
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        return matchesDate && matchesDoctor && matchesStatus;
      })
      .sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return b.time.localeCompare(a.time);
      });
  }, [appointments, dateFilter, doctorFilter, statusFilter]);

  const handleCheckIn = (appointmentId: string) => {
    startTransition(async () => {
      const result = await checkInPatient(appointmentId);
      if (result.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId
              ? { ...a, status: "arrived" as const, checkInTime: new Date().toISOString(), checkedInBy: "rec_8001" }
              : a
          )
        );
        toast.success("Patient checked in successfully");
      } else {
        toast.error(result.error || "Failed to check in patient");
      }
    });
  };

  const handleCancel = (appointmentId: string) => {
    startTransition(async () => {
      const result = await cancelAppointment(appointmentId);
      if (result.success) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appointmentId ? { ...a, status: "cancelled" as const } : a
          )
        );
        toast.success("Appointment cancelled");
      } else {
        toast.error(result.error || "Failed to cancel appointment");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="shadow-sm border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-muted border"
              />
            </div>
            <div className="flex-1">
              <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                <SelectTrigger className="bg-muted border">
                  <SelectValue placeholder="All Doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Doctors</SelectItem>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name.full}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-muted border">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(dateFilter || doctorFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-muted-foreground self-center"
                onClick={() => {
                  setDateFilter("");
                  setDoctorFilter("all");
                  setStatusFilter("all");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground px-1">
        {filtered.length} appointment{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Appointments Table */}
      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="Try changing the filters or book a new appointment."
            actionLabel="Book Appointment"
            actionHref={ROUTES.NEW_APPOINTMENT}
          />
        ) : (
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt) => (
                <TableRow key={apt.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="text-foreground font-medium">
                    {formatDate(apt.date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTime(apt.time)}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={ROUTES.PATIENT(apt.patientId)}
                      className="text-primary hover:text-primary hover:underline font-medium"
                    >
                      {getPatientName(apt.patientId, patients)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getDoctorName(apt.doctorId, doctors)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{apt.visitType}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {apt.reason}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={apt.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {apt.status === APPOINTMENT_STATUS.SCHEDULED && (
                        <Button
                          size="sm"
                          className="bg-status-teal-text hover:bg-status-teal-text/90 text-white h-8 text-xs"
                          onClick={() => handleCheckIn(apt.id)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Check In"
                          )}
                        </Button>
                      )}
                      {(apt.status === APPOINTMENT_STATUS.SCHEDULED ||
                        apt.status === APPOINTMENT_STATUS.NOT_ARRIVED) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-status-error-text border-status-error-border hover:bg-status-error-bg h-8 text-xs"
                          onClick={() => handleCancel(apt.id)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
