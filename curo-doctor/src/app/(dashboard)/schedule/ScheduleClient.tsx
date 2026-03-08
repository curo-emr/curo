"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Appointment, Patient } from "@/types";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  cn,
  getPatientName,
  getPatientMeta,
  getTodayString,
} from "@/lib/utils";
import { ROUTES, APPOINTMENT_STATUS } from "@/lib/constants";
import {
  CuroCalendar,
  CalendarEvent,
  formatDateStr,
  getRelativeDayLabel,
} from "@/components/ui/CuroCalendar";
import type { CalendarEventColor } from "@/components/ui/CuroCalendar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function statusToColor(status: Appointment["status"]): CalendarEventColor {
  switch (status) {
    case "waiting":      return "yellow";
    case "in_progress":  return "blue";
    case "completed":    return "green";
    case "cancelled":
    case "no_show":      return "gray";
    default:             return "blue";
  }
}

function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Status → left-border color
const STATUS_BORDER: Record<string, string> = {
  waiting:     "border-l-amber-400",
  in_progress: "border-l-blue-500",
  completed:   "border-l-green-500",
  cancelled:   "border-l-slate-300",
  no_show:     "border-l-slate-300",
};

// ---------------------------------------------------------------------------
// Appointment card
// ---------------------------------------------------------------------------
function AppointmentCard({
  apt,
  patients,
}: {
  apt: Appointment;
  patients: Patient[];
}) {
  const name = getPatientName(apt.patientId, patients);
  const meta = getPatientMeta(apt.patientId, patients);
  const initial = name.charAt(0).toUpperCase();
  const borderColor = STATUS_BORDER[apt.status] ?? "border-l-slate-200";

  const isInProgress = apt.status === APPOINTMENT_STATUS.IN_PROGRESS;
  const isCompleted  = apt.status === APPOINTMENT_STATUS.COMPLETED;

  return (
    <div
      className={cn(
        "group bg-white rounded-xl border border-slate-200 border-l-[3px] p-4",
        "hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col gap-3",
        borderColor
      )}
    >
      {/* Row 1 — time + status */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800 tabular-nums">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {formatTime(apt.time)}
        </span>
        <StatusBadge status={apt.status} />
      </div>

      {/* Row 2 — patient */}
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold select-none",
            isInProgress
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600"
          )}
        >
          {initial}
        </div>
        <div className="min-w-0">
          <Link
            href={ROUTES.PATIENT(apt.patientId)}
            className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors block truncate"
          >
            {name}
          </Link>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {meta ? `${meta.age}y ${meta.sex.charAt(0).toUpperCase()}  ·  ` : ""}
            {apt.visitType}
            {apt.room ? `  ·  ${apt.room}` : ""}
          </p>
        </div>
      </div>

      {/* Row 3 — reason (single line, muted) */}
      <p className="text-xs text-slate-500 truncate leading-relaxed">
        {apt.reason}
      </p>

      {/* Row 4 — actions */}
      <div className="flex items-center gap-2 pt-0.5">
        {!isCompleted && !isInProgress && (
          <Link
            href={`${ROUTES.NEW_ENCOUNTER(apt.patientId)}?appointmentId=${apt.id}`}
            className="flex-1"
          >
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Start Visit
            </Button>
          </Link>
        )}
        {isInProgress && (
          <Link
            href={`${ROUTES.NEW_ENCOUNTER(apt.patientId)}?appointmentId=${apt.id}`}
            className="flex-1"
          >
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            >
              Resume Visit
            </Button>
          </Link>
        )}
        <Link href={ROUTES.PATIENT(apt.patientId)}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs bg-white hover:bg-slate-50 gap-0.5 px-3"
          >
            Chart <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Day appointments section (below calendar)
// ---------------------------------------------------------------------------
function DayAppointments({
  selectedDate,
  appointments,
  patients,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  patients: Patient[];
}) {
  const dateStr = formatDateStr(selectedDate);
  const todayStr = getTodayString();

  const daily = useMemo(
    () =>
      appointments
        .filter((a) => a.date === dateStr)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, dateStr]
  );

  const relativeLabel = getRelativeDayLabel(selectedDate);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-bold text-slate-900">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          {relativeLabel && (
            <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
              {relativeLabel}
            </span>
          )}
        </div>
        <span className="text-sm text-slate-400">
          {daily.length === 0
            ? "No visits"
            : `${daily.length} ${daily.length === 1 ? "visit" : "visits"}`}
        </span>
      </div>

      {/* Cards or empty state */}
      {daily.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {dateStr === todayStr
              ? "Clear schedule — enjoy your day."
              : "No visits scheduled."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {daily.map((apt) => (
            <AppointmentCard key={apt.id} apt={apt} patients={patients} />
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
  appointments: Appointment[];
  patients: Patient[];
}

export function ScheduleClient({ appointments, patients }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      appointments.map((apt) => ({
        id: apt.id,
        date: apt.date,
        title: getPatientName(apt.patientId, patients),
        subtitle: apt.time,
        color: statusToColor(apt.status),
        appointment: apt,
      })),
    [appointments, patients]
  );

  return (
    <div className="flex flex-col gap-6 pb-8 max-w-screen-xl mx-auto">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Schedule
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Your appointments, at a glance.
        </p>
      </div>

      {/* Full-width calendar */}
      <CuroCalendar
        events={calendarEvents}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        maxEventsPerDay={3}
      />

      {/* Divider */}
      <div className="border-t border-slate-100" />

      {/* Day appointments */}
      <DayAppointments
        selectedDate={selectedDate}
        appointments={appointments}
        patients={patients}
      />
    </div>
  );
}
