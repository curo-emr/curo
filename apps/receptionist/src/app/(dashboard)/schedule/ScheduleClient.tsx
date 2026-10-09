"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatAgeSex } from "@curo/web/format";
import { EmptyState } from "@curo/web/ui/empty-state";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { LoadError } from "@curo/web/ui/load-error";
import { PageHeader } from "@curo/web/ui/page-header";
import { Calendar as CalendarIcon, Clock, CalendarPlus, Loader2, Stethoscope } from "lucide-react";
import { Appointment, Patient, Doctor } from "@/types";
import { Button } from "@curo/web/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@curo/web/ui/select";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { getPatientName, getDoctorName, getTodayString, formatTime } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { isExpected } from "@/lib/queue";
import { useFrontDeskActions } from "@/lib/hooks/useFrontDeskActions";
import {
  CuroCalendar,
  CalendarEvent,
  calendarRange,
  formatDateStr,
  getRelativeDayLabel,
} from "@curo/web/ui/curo-calendar";
import { appointmentQueries, patientQueries } from "@/lib/queries";
import type { CalendarEventColor } from "@curo/web/ui/curo-calendar";
import { visitTypeLabel } from "@curo/web/appointments";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusToColor(status: Appointment["status"]): CalendarEventColor {
  switch (status) {
    case "waiting":      return "yellow";
    case "in_progress":  return "blue";
    case "completed":    return "green";
    case "arrived":      return "teal";
    case "cancelled":
    case "no_show":      return "gray";
    default:             return "blue";
  }
}

// ---------------------------------------------------------------------------
// Appointment card
// ---------------------------------------------------------------------------
function AppointmentCard({
  apt,
  patients,
  doctors,
  onCheckIn,
  pending,
}: {
  apt: Appointment;
  patients: Patient[];
  doctors: Doctor[];
  /** Only for today's patients who haven't arrived yet. */
  onCheckIn?: () => void;
  pending: boolean;
}) {
  const name = getPatientName(apt.patientId, patients);
  const patient = patients.find((p) => p.id === apt.patientId);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
          <Clock className="size-3.5 text-muted-foreground" />
          {formatTime(apt.time)}
        </span>
        <StatusBadge status={apt.status} />
      </div>

      <div className="flex items-center gap-2.5">
        <InitialsAvatar name={name} />
        <div className="min-w-0">
          <Link href={ROUTES.PATIENT(apt.patientId)} className="block truncate text-sm font-semibold text-foreground hover:text-primary">
            {name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[patient && formatAgeSex(patient.dob, patient.sex), apt.visitType && visitTypeLabel(apt.visitType)].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="truncate">{apt.reason}</p>
        <span className="flex shrink-0 items-center gap-1">
          <Stethoscope className="size-3" /> Dr. {getDoctorName(apt.doctorId, doctors)}
        </span>
      </div>

      {onCheckIn && (
        <Button size="sm" variant="outline" onClick={onCheckIn} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Check in
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day appointments section
// ---------------------------------------------------------------------------
function DayAppointments({
  selectedDate,
  appointments,
  patients,
  doctors,
  doctorFilter,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
  doctorFilter: string;
}) {
  const dateStr = formatDateStr(selectedDate);
  const todayStr = getTodayString();

  const daily = useMemo(
    () =>
      appointments
        .filter((a) => {
          const matchesDate = a.date === dateStr;
          const matchesDoctor =
            doctorFilter === "all" || a.doctorId === doctorFilter;
          return matchesDate && matchesDoctor;
        })
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, dateStr, doctorFilter]
  );

  const relativeLabel = getRelativeDayLabel(selectedDate);
  const { checkIn, pendingId } = useFrontDeskActions();

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-semibold text-foreground">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          {relativeLabel && (
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
              {relativeLabel}
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {daily.length === 0
            ? "No visits"
            : `${daily.length} ${daily.length === 1 ? "visit" : "visits"}`}
        </span>
      </div>

      {daily.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title={dateStr === todayStr ? "No visits booked for today" : "No visits booked for this day"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {daily.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              patients={patients}
              doctors={doctors}
              pending={pendingId === apt.id}
              onCheckIn={
                dateStr === todayStr && isExpected(apt)
                  ? () => checkIn(apt, getPatientName(apt.patientId, patients))
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
interface Props {
  doctors: Doctor[];
}

// Empty lists for "not loaded yet", so the memos below don't recompute on every render.
const NO_APPOINTMENTS: Appointment[] = [];
const NO_PATIENTS: Patient[] = [];

export function ScheduleClient({ doctors }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(() => new Date());
  const [doctorFilter, setDoctorFilter] = useState("all");

  // The appointments on the month's grid, and their patients, loaded per month.
  const { from, to } = calendarRange(month);
  const range = useQuery(appointmentQueries.range(from, to));
  const appointments = range.data ?? NO_APPOINTMENTS;
  const patients = useQuery(patientQueries.byIds(appointments.map((a) => a.patientId))).data ?? NO_PATIENTS;

  const selectedDateStr = formatDateStr(selectedDate);

  // Filter calendar events to match the active doctor filter
  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      appointments
        .filter(
          (apt) => doctorFilter === "all" || apt.doctorId === doctorFilter
        )
        .map((apt) => ({
          id: apt.id,
          date: apt.date,
          title: getPatientName(apt.patientId, patients),
          subtitle: apt.time,
          color: statusToColor(apt.status),
        })),
    [appointments, patients, doctorFilter]
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader title="Schedule" description="The month's bookings. Pick a day to see its visits.">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[190px]">
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

          <Button asChild variant="outline">
            <Link
              href={`${ROUTES.NEW_APPOINTMENT}?date=${selectedDateStr}${doctorFilter !== "all" ? `&doctorId=${doctorFilter}` : ""}`}
            >
              <CalendarPlus /> Book this day
            </Link>
          </Button>
        </div>
      </PageHeader>

      {!range.data && range.isError && (
        <LoadError what="the schedule" onRetry={() => void range.refetch()} retrying={range.isFetching} />
      )}

      {/* ── Full-width calendar ── */}
      <CuroCalendar
        events={calendarEvents}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        month={month}
        onMonthChange={setMonth}
        maxEventsPerDay={3}
      />

      <div className="border-t" />

      {/* ── Day appointments ── */}
      <DayAppointments
        selectedDate={selectedDate}
        appointments={appointments}
        patients={patients}
        doctors={doctors}
        doctorFilter={doctorFilter}
      />
    </div>
  );
}
