import { getAppointmentsByDate, getPatients, getDoctors, getVisitsByDate } from "@/lib/data/api";
import { getTodayString, getPatientName, getDoctorName, formatTime } from "@/lib/utils";
import { APPOINTMENT_STATUS, ROUTES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { TodayAppointments } from "@/components/features/dashboard/TodayAppointments";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { QueueSummary } from "@/components/features/dashboard/QueueSummary";
import type { Appointment, Patient, Doctor } from "@/types";

export default async function DashboardPage() {
  const todayStr = getTodayString();
  const [appointments, patients, doctors, visits] = await Promise.all([
    getAppointmentsByDate(todayStr),
    getPatients(),
    getDoctors(),
    getVisitsByDate(todayStr),
  ]);

  const todaysSchedule = appointments.sort((a, b) => a.time.localeCompare(b.time));

  const today = new Date();
  const dateHeading = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Stats
  const totalCount = todaysSchedule.length;
  const checkedInCount = todaysSchedule.filter(
    (a) => a.status === APPOINTMENT_STATUS.ARRIVED || a.status === APPOINTMENT_STATUS.WAITING
  ).length;
  const withDoctorCount = todaysSchedule.filter(
    (a) => a.status === APPOINTMENT_STATUS.IN_PROGRESS
  ).length;
  const completedCount = todaysSchedule.filter(
    (a) => a.status === APPOINTMENT_STATUS.COMPLETED
  ).length;

  const statCards = [
    { label: "Total Appointments", value: totalCount, color: "text-blue-700 bg-blue-50 border-blue-200" },
    { label: "Checked In", value: checkedInCount, color: "text-orange-700 bg-orange-50 border-orange-200" },
    { label: "With Doctor", value: withDoctorCount, color: "text-sky-700 bg-sky-50 border-sky-200" },
    { label: "Completed", value: completedCount, color: "text-green-700 bg-green-50 border-green-200" },
  ];

  // Upcoming appointments: next 3 that are scheduled/not_arrived, sorted by time
  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcomingAppointments = todaysSchedule
    .filter(
      (a) =>
        a.time >= currentTimeStr &&
        (a.status === APPOINTMENT_STATUS.SCHEDULED || a.status === APPOINTMENT_STATUS.NOT_ARRIVED)
    )
    .slice(0, 3);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateHeading}</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`rounded-lg border p-4 ${stat.color}`}>
            <p className="text-xs font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main Content: 2/3 + 1/3 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <TodayAppointments
            appointments={todaysSchedule}
            patients={patients}
            doctors={doctors}
          />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions />

          {/* Queue Summary */}
          <QueueSummary
            appointments={todaysSchedule}
            patients={patients}
            doctors={doctors}
          />

          {/* Upcoming Appointments */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-500" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No upcoming appointments
                  </div>
                ) : (
                  upcomingAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-slate-900">
                          {getPatientName(apt.patientId, patients)}
                        </span>
                        <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                          {formatTime(apt.time)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        Dr. {getDoctorName(apt.doctorId, doctors)} &bull; {apt.visitType}
                      </p>
                    </div>
                  ))
                )}
              </div>
              {upcomingAppointments.length > 0 && (
                <div className="p-3 border-t border-slate-100">
                  <Link
                    href={ROUTES.SCHEDULE}
                    className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    View Full Schedule
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
