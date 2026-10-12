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
import { LoadError } from "@curo/web/ui/load-error";
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
import { StatusBadge, statusClassName, statusLabel } from "@curo/web/ui/status-badge";
import { ConfirmAction } from "@curo/web/ui/confirm-action";
import { ROUTES } from "@/lib/constants";
import { updateAppointmentStatus } from "@/lib/actions/appointment-actions";
import { RecordPaymentCell } from "@/components/features/payments/RecordPaymentCell";
import { getMyPaymentsForAppointments, type Payment } from "@/lib/api/payments";
import { getAppointmentsPage } from "@/lib/api/appointments";
import { getPatientsByIds } from "@/lib/api/patients";
import { isMissed } from "@/lib/queue";
import { toast } from "sonner";
import { isClosedAppointmentStatus, nextAppointmentStatuses, visitTypeLabel } from "@curo/web/appointments";

type AppointmentStatus = 'scheduled' | 'not_arrived' | 'arrived' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

interface AppointmentListProps {
  doctors: Doctor[];
}

// Every status, in workflow order, to filter by; the filter adds "All statuses".
const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled", "not_arrived", "arrived", "waiting", "in_progress", "completed", "cancelled", "no_show",
];

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  ...ALL_STATUSES.filter(s => s !== "not_arrived").map(value => ({ label: statusLabel(value), value })),
];

// The question asked before a change that closes an appointment for good.
const CLOSE_CONFIRMS: Partial<Record<AppointmentStatus, {
  title: (patientName: string) => string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}>> = {
  completed: {
    title: name => `Mark ${name}'s visit complete?`,
    description: "They leave today's queue. A completed visit can't be reopened.",
    confirmLabel: "Complete visit",
  },
  cancelled: {
    title: name => `Cancel ${name}'s appointment?`,
    description: "The slot is freed for another booking. A cancelled appointment can't be reopened; book a new one if they still need it.",
    confirmLabel: "Cancel appointment",
    cancelLabel: "Keep appointment",
    destructive: true,
  },
  no_show: {
    title: name => `Mark ${name} as a no-show?`,
    description: "The slot is freed for another booking. This can't be undone; book a new appointment if they come later.",
    confirmLabel: "Mark no-show",
    destructive: true,
  },
};

/** Appointments, latest first, paged and filtered on the server. */
export function AppointmentList({ doctors }: AppointmentListProps) {
  const [dateFilter, setDateFilter] = useState(getTodayString());
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  // Changes made here, shown before (and in place of) what the page was loaded with.
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AppointmentStatus>>({});
  const [recordedPayments, setRecordedPayments] = useState<Record<string, Payment>>({});
  // A closing change waiting for the desk to confirm it.
  const [confirming, setConfirming] = useState<{ id: string; patientName: string; status: AppointmentStatus } | null>(null);
  const confirmCopy = confirming && CLOSE_CONFIRMS[confirming.status];

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
                  <SelectValue placeholder="All doctors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All doctors</SelectItem>
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
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <LoadError what="appointments" />
        ) : appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="Try changing the filters or book a new appointment."
            action={<Button asChild variant="outline" size="sm"><Link href={ROUTES.NEW_APPOINTMENT}>Book appointment</Link></Button>}
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
                const patientName = getPatientName(apt.patientId, patients);
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
                        {patientName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getDoctorName(apt.doctorId, doctors)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{visitTypeLabel(apt.visitType)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {apt.reason}
                    </TableCell>
                    <TableCell>
                      <StatusMenu
                        status={status}
                        pending={isPending}
                        onChange={(next) => {
                          if (CLOSE_CONFIRMS[next]) setConfirming({ id: apt.id, patientName, status: next });
                          else void handleStatusChange(apt.id, next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {/* Nothing to pay for a visit that didn't happen, unless it was paid already. */}
                      {isMissed(apt) && !paymentsByAppt[apt.id] ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <RecordPaymentCell
                          appointmentId={apt.id}
                          patientId={apt.patientId}
                          patientName={patientName}
                          existingPayment={paymentsByAppt[apt.id]}
                          onRecorded={(payment) =>
                            setRecordedPayments((prev) => ({ ...prev, [apt.id]: payment }))
                          }
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {confirming && confirmCopy && (
        <ConfirmAction
          open
          onOpenChange={(open) => { if (!open) setConfirming(null); }}
          title={confirmCopy.title(confirming.patientName)}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          cancelLabel={confirmCopy.cancelLabel}
          destructive={confirmCopy.destructive}
          onConfirm={() => void handleStatusChange(confirming.id, confirming.status)}
        />
      )}

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

/** A row's status: a menu of the changes it can still make, or just the badge once it's closed. */
function StatusMenu({ status, pending, onChange }: {
  status: AppointmentStatus;
  pending: boolean;
  onChange: (status: AppointmentStatus) => void;
}) {
  if (isClosedAppointmentStatus(status)) return <StatusBadge status={status} className="h-7 rounded-full px-2.5" />;
  return (
    <Select value={status} onValueChange={(val) => onChange(val as AppointmentStatus)} disabled={pending}>
      <SelectTrigger
        className={cn(
          "h-7 w-auto min-w-[110px] text-xs font-medium border rounded-full px-2.5 focus:ring-0 focus:ring-offset-0",
          statusClassName(status),
        )}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <SelectValue>{statusLabel(status)}</SelectValue>
        )}
      </SelectTrigger>
      <SelectContent>
        {[status, ...nextAppointmentStatuses(status)].map((value) => (
          <SelectItem key={value} value={value}>
            {statusLabel(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
