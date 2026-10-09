"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadError } from "@curo/web/ui/load-error";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronRight,
  CalendarPlus,
  Stethoscope,
} from "lucide-react";
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
import { checkInPatient } from "@/lib/actions/checkin-actions";
import {
  cn,
  getPatientName,
  getPatientMeta,
  getDoctorName,
  getTodayString,
  formatTime,
} from "@/lib/utils";
import { ROUTES, APPOINTMENT_STATUS } from "@/lib/constants";
import {
  CuroCalendar,
  CalendarEvent,
  calendarRange,
  formatDateStr,
  getRelativeDayLabel,
} from "@curo/web/ui/curo-calendar";
import { appointmentQueries, invalidateAppointments, patientQueries } from "@/lib/queries";
import type { CalendarEventColor } from "@curo/web/ui/curo-calendar";

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

// Status → left-border accent
const STATUS_BORDER: Record<string, string> = {
  waiting:     "border-l-amber-400",
  in_progress: "border-l-blue-500",
  completed:   "border-l-green-500",
  arrived:     "border-l-teal-400",
  cancelled:   "border-l-slate-300",
  no_show:     "border-l-slate-300",
};

const canCheckIn = (status: Appointment["status"]) =>
  status === APPOINTMENT_STATUS.SCHEDULED ||
  status === APPOINTMENT_STATUS.NOT_ARRIVED;

// ---------------------------------------------------------------------------
// Appointment card
// ---------------------------------------------------------------------------
function AppointmentCard({
  apt,
  patients,
  doctors,
}: {
  apt: Appointment;
  patients: Patient[];
  doctors: Doctor[];
}) {
  const name = getPatientName(apt.patientId, patients);
  const meta = getPatientMeta(apt.patientId, patients);
  const doctorName = getDoctorName(apt.doctorId, doctors);
  const initial = name.charAt(0).toUpperCase();
  const borderColor = STATUS_BORDER[apt.status] ?? "border-l-slate-200";

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isCheckingIn, startCheckIn] = useTransition();

  // Check-in queues the patient for nurse triage (backend), then shows the queue board.
  const handleCheckIn = () =>
    startCheckIn(async () => {
      const result = await checkInPatient(apt.id);
      if (!result.success) {
        toast.error(result.error || "Failed to check in patient");
        return;
      }
      void invalidateAppointments(queryClient);
      toast.success(`${name} checked in — waiting for nurse triage`);
      router.push(ROUTES.QUEUE);
    });

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
        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-sm font-bold select-none">
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

      {/* Row 3 — reason + doctor last name */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 truncate">{apt.reason}</p>
        <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
          <Stethoscope className="w-3 h-3" />
          {doctorName.split(" ").slice(-1)[0]}
        </span>
      </div>

      {/* Row 4 — actions */}
      <div className="flex items-center gap-2 pt-0.5">
        {canCheckIn(apt.status) && (
          <Button
            size="sm"
            className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            onClick={handleCheckIn}
            disabled={isCheckingIn}
          >
            {isCheckingIn ? "Checking in…" : "Check In"}
          </Button>
        )}
        {apt.status === APPOINTMENT_STATUS.ARRIVED && (
          <Link href={ROUTES.QUEUE} className="flex-1">
            <Button
              size="sm"
              className="w-full h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
            >
              View in Queue
            </Button>
          </Link>
        )}
        <Link href={ROUTES.PATIENT(apt.patientId)}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs bg-white hover:bg-slate-50 gap-0.5 px-3"
          >
            Patient <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
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

      {daily.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            {dateStr === todayStr
              ? "No visits scheduled for today."
              : "No visits scheduled for this day."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {daily.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              patients={patients}
              doctors={doctors}
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
    <div className="flex flex-col gap-6 pb-8 max-w-screen-xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Doctor Schedules
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View doctor availability and scheduled appointments.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[190px] bg-white border-slate-200 shadow-sm text-sm h-9">
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

          <Link
            href={`${ROUTES.NEW_APPOINTMENT}?date=${selectedDateStr}${doctorFilter !== "all" ? `&doctorId=${doctorFilter}` : ""}`}
          >
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-sm text-blue-600 border-blue-200 hover:bg-blue-50 gap-1.5"
            >
              <CalendarPlus className="w-4 h-4" />
              Book Slot
            </Button>
          </Link>
        </div>
      </div>

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

      {/* ── Divider ── */}
      <div className="border-t border-slate-100" />

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
