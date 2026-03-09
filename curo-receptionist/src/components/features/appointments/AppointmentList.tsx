"use client";

import { useState, useMemo } from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getPatientName,
  getDoctorName,
  formatDate,
  formatTime,
  getTodayString,
  formatStatus,
} from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { updateAppointmentStatus } from "@/lib/actions/appointment-actions";
import { toast } from "sonner";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

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

const ALL_STATUSES: { label: string; value: AppointmentStatus }[] = [
  { label: "Scheduled", value: "scheduled" },
  { label: "Not Arrived", value: "not_arrived" },
  { label: "Arrived", value: "arrived" },
  { label: "Waiting", value: "waiting" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No Show", value: "no_show" },
];

const statusStyles: Record<AppointmentStatus, string> = {
  waiting:     "bg-status-warning-bg text-status-warning-text border-status-warning-border",
  in_progress: "bg-status-info-bg text-status-info-text border-status-info-border",
  completed:   "bg-status-success-bg text-status-success-text border-status-success-border",
  scheduled:   "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  not_arrived: "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  arrived:     "bg-status-teal-bg text-status-teal-text border-status-teal-border",
  cancelled:   "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
  no_show:     "bg-status-error-bg text-status-error-text border-status-error-border",
};

const statusLabels: Partial<Record<AppointmentStatus, string>> = {
  not_arrived: "Not Arrived",
  in_progress: "In Progress",
  no_show: "No Show",
};

function getStatusLabel(status: AppointmentStatus) {
  return statusLabels[status] ?? formatStatus(status);
}

export function AppointmentList({ appointments: initialAppointments, patients, doctors }: AppointmentListProps) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

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

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setPendingIds((prev) => new Set(prev).add(appointmentId));

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
    );

    const result = await updateAppointmentStatus(appointmentId, newStatus);

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });

    if (result.success) {
      toast.success("Status updated");
    } else {
      // Revert optimistic update
      setAppointments(initialAppointments);
      toast.error(result.error || "Failed to update status");
    }
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt) => {
                const isPending = pendingIds.has(apt.id);
                const status = apt.status as AppointmentStatus;
                return (
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
                      <Select
                        value={status}
                        onValueChange={(val) => handleStatusChange(apt.id, val as AppointmentStatus)}
                        disabled={isPending}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-7 w-auto min-w-[110px] text-xs font-medium border rounded-full px-2.5 focus:ring-0 focus:ring-offset-0",
                            statusStyles[status] ?? "bg-status-neutral-bg text-status-neutral-text border-status-neutral-border",
                            status === "cancelled" && "line-through"
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue>{getStatusLabel(status)}</SelectValue>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
