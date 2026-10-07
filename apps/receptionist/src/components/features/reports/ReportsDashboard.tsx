"use client";

import { useState, useMemo } from "react";
import type { Appointment, Patient, Doctor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Badge } from "@curo/web/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@curo/web/ui/table";
import { CalendarCheck, UserCheck, CheckCircle2, XCircle, Ban, UserPlus, Clock } from "lucide-react";
import { cn, getTodayString } from "@/lib/utils";
import { APPOINTMENT_STATUS, VISIT_TYPES } from "@/lib/constants";

interface ReportsDashboardProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
}

type DateRange = "today" | "week" | "month";

function getDateRangeBounds(range: DateRange): { start: string; end: string } {
  const now = new Date();
  const todayStr = getTodayString();

  if (range === "today") {
    return { start: todayStr, end: todayStr };
  }

  if (range === "week") {
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: formatDateStr(startOfWeek),
      end: formatDateStr(endOfWeek),
    };
  }

  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateStr(startOfMonth),
    end: formatDateStr(endOfMonth),
  };
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isDateInRange(dateStr: string, start: string, end: string): boolean {
  return dateStr >= start && dateStr <= end;
}

export function ReportsDashboard({
  appointments,
  patients,
  doctors,
}: ReportsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange>("today");

  const { start, end } = useMemo(() => getDateRangeBounds(dateRange), [dateRange]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => isDateInRange(a.date, start, end));
  }, [appointments, start, end]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const checkedIn = filteredAppointments.filter(
      (a) =>
        a.status === APPOINTMENT_STATUS.ARRIVED ||
        a.status === APPOINTMENT_STATUS.WAITING ||
        a.status === APPOINTMENT_STATUS.IN_PROGRESS ||
        a.status === APPOINTMENT_STATUS.COMPLETED
    ).length;
    const completed = filteredAppointments.filter(
      (a) => a.status === APPOINTMENT_STATUS.COMPLETED
    ).length;
    const noShows = filteredAppointments.filter(
      (a) => a.status === APPOINTMENT_STATUS.NO_SHOW
    ).length;
    const cancelled = filteredAppointments.filter(
      (a) => a.status === APPOINTMENT_STATUS.CANCELLED
    ).length;
    const newRegistrations = patients.filter((p) =>
      isDateInRange(p.registeredAt.split("T")[0], start, end)
    ).length;

    return { total, checkedIn, completed, noShows, cancelled, newRegistrations };
  }, [filteredAppointments, patients, start, end]);

  // Appointments by doctor
  const doctorStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; noShows: number }> = {};
    filteredAppointments.forEach((a) => {
      if (!map[a.doctorId]) {
        map[a.doctorId] = { total: 0, completed: 0, noShows: 0 };
      }
      map[a.doctorId].total++;
      if (a.status === APPOINTMENT_STATUS.COMPLETED) map[a.doctorId].completed++;
      if (a.status === APPOINTMENT_STATUS.NO_SHOW) map[a.doctorId].noShows++;
    });
    return Object.entries(map).map(([doctorId, data]) => {
      const doc = doctors.find((d) => d.id === doctorId);
      return {
        doctorId,
        name: doc?.name.full || "Unknown",
        specialty: doc?.specialty || "",
        ...data,
      };
    });
  }, [filteredAppointments, doctors]);

  // Appointments by visit type
  const visitTypeStats = useMemo(() => {
    const map: Record<string, number> = {};
    VISIT_TYPES.forEach((t) => (map[t] = 0));
    filteredAppointments.forEach((a) => {
      if (map[a.visitType] !== undefined) {
        map[a.visitType]++;
      } else {
        map[a.visitType] = 1;
      }
    });
    return Object.entries(map).map(([type, count]) => ({ type, count }));
  }, [filteredAppointments]);

  // Peak hours
  const peakHours = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    for (let h = 6; h < 22; h++) {
      const label = `${String(h).padStart(2, "0")}:00-${String(h + 1).padStart(2, "0")}:00`;
      hourCounts[label] = 0;
    }
    filteredAppointments.forEach((a) => {
      const hour = parseInt(a.time.split(":")[0], 10);
      const label = `${String(hour).padStart(2, "0")}:00-${String(hour + 1).padStart(2, "0")}:00`;
      if (hourCounts[label] !== undefined) {
        hourCounts[label]++;
      }
    });
    const entries = Object.entries(hourCounts).filter(([, count]) => count > 0);
    const maxCount = Math.max(...entries.map(([, c]) => c), 1);
    return entries.map(([hour, count]) => ({ hour, count, pct: (count / maxCount) * 100 }));
  }, [filteredAppointments]);

  const STAT_CARDS = [
    {
      label: "Total Appointments",
      value: stats.total,
      icon: CalendarCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Check-ins",
      value: stats.checkedIn,
      icon: UserCheck,
      color: "text-status-teal-text",
      bg: "bg-status-teal-bg",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: CheckCircle2,
      color: "text-status-success-text",
      bg: "bg-status-success-bg",
    },
    {
      label: "No Shows",
      value: stats.noShows,
      icon: XCircle,
      color: "text-status-error-text",
      bg: "bg-status-error-bg",
    },
    {
      label: "Cancellations",
      value: stats.cancelled,
      icon: Ban,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    {
      label: "New Registrations",
      value: stats.newRegistrations,
      icon: UserPlus,
      color: "text-status-purple-text",
      bg: "bg-status-purple-bg",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        {(["today", "week", "month"] as DateRange[]).map((range) => (
          <Button
            key={range}
            variant={dateRange === range ? "default" : "outline"}
            size="sm"
            className={cn(
              dateRange === range
                ? "bg-primary hover:bg-primary/90 text-white"
                : "text-muted-foreground border hover:bg-muted"
            )}
            onClick={() => setDateRange(range)}
          >
            {range === "today" ? "Today" : range === "week" ? "This Week" : "This Month"}
          </Button>
        ))}
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map((card) => (
          <Card key={card.label} className="shadow-sm border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", card.bg)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Appointments by Doctor */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="text-lg">Appointments by Doctor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {doctorStats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No appointment data for the selected period.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">No Shows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorStats.map((doc) => (
                  <TableRow key={doc.doctorId}>
                    <TableCell className="font-medium text-foreground">{doc.name}</TableCell>
                    <TableCell className="text-muted-foreground">{doc.specialty}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {doc.total}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-status-success-bg text-status-success-text">
                        {doc.completed}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-status-error-bg text-status-error-text">
                        {doc.noShows}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Appointments by Visit Type */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="text-lg">Appointments by Visit Type</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {visitTypeStats.map((vt) => (
              <div
                key={vt.type}
                className="p-4 rounded-lg border bg-white text-center"
              >
                <p className="text-2xl font-bold text-foreground">{vt.count}</p>
                <p className="text-sm text-muted-foreground mt-1">{vt.type}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Peak Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {peakHours.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              No appointment data for the selected period.
            </div>
          ) : (
            <div className="space-y-3">
              {peakHours.map(({ hour, count, pct }) => (
                <div key={hour} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-28 shrink-0 font-mono">
                    {hour}
                  </span>
                  <div className="flex-1 h-7 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    >
                      {pct > 20 && (
                        <span className="text-xs text-white font-medium">{count}</span>
                      )}
                    </div>
                  </div>
                  {pct <= 20 && (
                    <span className="text-sm text-muted-foreground font-medium w-6">{count}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
