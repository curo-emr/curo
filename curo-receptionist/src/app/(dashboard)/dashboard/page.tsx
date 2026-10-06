"use client";

import { useState, useEffect } from "react";
import { Loader2, Clock, ArrowRight } from "lucide-react";
import { getTodayString, getPatientName, getDoctorName, formatTime } from "@/lib/utils";
import { APPOINTMENT_STATUS, ROUTES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { TodayAppointments } from "@/components/features/dashboard/TodayAppointments";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { QueueSummary } from "@/components/features/dashboard/QueueSummary";
import { getAppointments } from "@/lib/api/appointments";
import { isAwaitingDoctor } from "@/lib/queue";
import { getPatients } from "@/lib/api/patients";
import { getDoctors, type Practitioner } from "@/lib/api/practitioners";
import type { Appointment, Patient, Doctor } from "@/types";

function mapPractitionerToDoctor(p: Practitioner): Doctor {
  return {
    id: p.id,
    name: p.name,
    specialty: p.specialty,
    phone: p.phone,
    email: p.email,
    roomNumber: "",
    availableDays: [],
    slotDurationMinutes: 30,
    workingHours: { start: "08:00", end: "17:00" },
  };
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = getTodayString();

  useEffect(() => {
    Promise.all([
      getAppointments({ date: todayStr }),
      getPatients(),
      getDoctors(),
    ])
      .then(([appts, pts, practs]) => {
        setAppointments(appts);
        setPatients(pts);
        setDoctors(practs.map(mapPractitionerToDoctor));
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [todayStr]);

  const todaysSchedule = appointments.sort((a, b) => a.time.localeCompare(b.time));

  const today = new Date();
  const dateHeading = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const totalCount = todaysSchedule.length;
  const checkedInCount = todaysSchedule.filter(isAwaitingDoctor).length;
  const withDoctorCount = todaysSchedule.filter(a => a.queueStage === "with_doctor").length;
  const completedCount = todaysSchedule.filter(a => a.status === APPOINTMENT_STATUS.COMPLETED).length;

  const statCards = [
    { label: "Total Appointments", value: totalCount, color: "text-blue-700 bg-blue-50 border-blue-200" },
    { label: "Checked In", value: checkedInCount, color: "text-orange-700 bg-orange-50 border-orange-200" },
    { label: "With Doctor", value: withDoctorCount, color: "text-sky-700 bg-sky-50 border-sky-200" },
    { label: "Completed", value: completedCount, color: "text-green-700 bg-green-50 border-green-200" },
  ];

  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcomingAppointments = todaysSchedule
    .filter(a => a.time >= currentTimeStr &&
      (a.status === APPOINTMENT_STATUS.SCHEDULED || a.status === APPOINTMENT_STATUS.NOT_ARRIVED))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">{dateHeading}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className={`rounded-lg border p-4 ${stat.color}`}>
            <p className="text-xs font-medium opacity-80">{stat.label}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayAppointments appointments={todaysSchedule} patients={patients} doctors={doctors} />
        </div>

        <div className="space-y-6">
          <QuickActions />
          <QueueSummary appointments={todaysSchedule} patients={patients} doctors={doctors} />

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
                  <div className="p-6 text-center text-sm text-muted-foreground">No upcoming appointments</div>
                ) : (
                  upcomingAppointments.map(apt => (
                    <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors">
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
                  <Link href={ROUTES.SCHEDULE} className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                    View Full Schedule <ArrowRight className="h-3 w-3" />
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
