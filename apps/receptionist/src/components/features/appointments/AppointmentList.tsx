"use client";

import { useState, useMemo } from "react";
import { useServerPagination } from "@curo/web/hooks";
import type { Doctor } from "@/types";
import { Card, CardContent } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@curo/web/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { EmptyState } from "@curo/web/ui/empty-state";
import { Pagination } from "@curo/web/ui/pagination";
import { Calendar, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getPatientName,
  getDoctorName,
  formatDate,
  formatTime,
  getTodayString,
} from "@/lib/utils";
import { statusClassName, statusLabel } from "@curo/web/ui/status-badge";
import { ROUTES } from "@/lib/constants";
import { updateAppointmentStatus } from "@/lib/actions/appointment-actions";
import { RecordPaymentCell } from "@/components/features/payments/RecordPaymentCell";
import { getMyPaymentsForAppointments, type Payment } from "@/lib/api/payments";
import { getAppointmentsPage } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { toast } from "sonner";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface AppointmentListProps {
  doctors: Doctor[];
}

// Every status the desk can set, in workflow order; the filter adds "All statuses".
const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled", "not_arrived", "arrived", "waiting", "in_progress", "completed", "cancelled", "no_show",
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  ...ALL_STATUSES.filter(s => s !== "not_arrived").map(value => ({ label: statusLabel(value), value })),
];

/** Appointments, latest first, paged and filtered on the server. */
export function AppointmentList({ doctors }: AppointmentListProps) {
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  // Changes made here, shown before (and in place of) what the page was loaded with.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AppointmentStatus>>({});
  const [recordedPayments, setRecordedPayments] = useState<Record<string, Payment>>({});

  const { data, items, total, isLoading, isError, page, setPage, pageSize, setPageSize } = useServerPagination(
    async (page, pageSize) => {
      const result = await getAppointmentsPage({
        page,
        pageSize,
        date: dateFilter || undefined,
        practitionerId: doctorFilter === "all" ? undefined : doctorFilter,
        status: statusFilter === "all" ? undefined : (statusFilter as AppointmentStatus),
      });
      const [patients, payments] = await Promise.all([
        getPatientsByIds(result.items.map((a) => a.patientId)),
        getMyPaymentsForAppointments(result.items.map((a) => a.id)),
      ]);
      return { ...result, patients, payments };
    },
    [dateFilter, doctorFilter, statusFilter],
  );
  const patients = data?.patients ?? [];
  const appointments = items.map((a) => (statusOverrides[a.id] ? { ...a, status: statusOverrides[a.id] } : a));
  const paymentsByAppt = useMemo(() => {
    const byAppointment: Record<string, Payment> = {};
    for (const p of data?.payments ?? []) if (p.appointmentId) byAppointment[p.appointmentId] = p;
    return { ...byAppointment, ...recordedPayments };
  }, [data, recordedPayments]);

  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setPendingIds((prev) => new Set(prev).add(appointmentId));
    const previous = statusOverrides[appointmentId];
    setStatusOverrides((prev) => ({ ...prev, [appointmentId]: newStatus }));

    const result = await updateAppointmentStatus(appointmentId, newStatus);

    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(appointmentId);
      return next;
    });

    if (result.success) {
      toast.success("Status updated");
    } else {
      setStatusOverrides((prev) => {
        const next = { ...prev };
        if (previous) next[appointmentId] = previous;
        else delete next[appointmentId];
        return next;
      });
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
                  <SelectValue placeholder="All statuses" />
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
        {isLoading ? "Loading appointments…" : `${total} appointment${total !== 1 ? "s" : ""} found`}
      </p>

      {/* Appointments Table */}
      <div className="bg-white rounded-md border overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <p className="h-32 flex items-center justify-center text-sm text-destructive">Failed to load appointments.</p>
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="Try changing the filters or book a new appointment."
            action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.NEW_APPOINTMENT}>Book Appointment</Link></Button>}
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
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((apt) => {
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
                            statusClassName(status),
                          )}
                        >
                          {isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <SelectValue>{statusLabel(status)}</SelectValue>
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_STATUSES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {statusLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <RecordPaymentCell
                        appointmentId={apt.id}
                        patientId={apt.patientId}
                        patientName={getPatientName(apt.patientId, patients)}
                        existingPayment={paymentsByAppt[apt.id]}
                        onRecorded={(payment) =>
                          setRecordedPayments((prev) => ({ ...prev, [apt.id]: payment }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
