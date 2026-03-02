import { getAppointments, getPendingLabOrders, getOpenTasks, getPatients } from "@/lib/data/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { calculateAge, getTodayString } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DashboardSidebar } from "@/components/features/dashboard/DashboardSidebar";

export default async function DashboardPage() {
  const todayStr = getTodayString();
  const appointments = await getAppointments();
  const todaysSchedule = appointments
    .filter(a => a.date === todayStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const pendingLabs = await getPendingLabOrders();
  const tasks = await getOpenTasks();

  const patients = await getPatients();
  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name.full || "Unknown Patient";
  const getPatientMetadata = (id: string) => {
    const p = patients.find(pat => pat.id === id);
    if (!p) return null;
    return { age: calculateAge(p.dob), sex: p.sex };
  };

  const today = new Date();
  const dateHeading = today.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{dateHeading}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Schedule Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Today&apos;s Schedule
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                  {todaysSchedule.length} Appointment{todaysSchedule.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {todaysSchedule.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No appointments scheduled for today.</div>
                ) : (
                  todaysSchedule.map(apt => {
                    const patientMeta = getPatientMetadata(apt.patientId);
                    return (
                      <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-16 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-700">
                            <span className="text-sm font-semibold">{apt.time}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Link href={`/patients/${apt.patientId}`} className="font-semibold text-base text-slate-900 hover:text-blue-600 transition-colors">
                                {getPatientName(apt.patientId)}
                              </Link>
                              <StatusBadge status={apt.status} />
                            </div>
                            <div className="text-sm text-slate-500 mb-1">
                              {patientMeta?.age}y • {patientMeta?.sex.charAt(0).toUpperCase()}{patientMeta?.sex.slice(1)} • {apt.visitType} — {apt.reason}
                            </div>
                            {apt.room && (
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" /> {apt.room}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Always-visible action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/patients/${apt.patientId}`}>
                            <Button variant="outline" size="sm" className="h-8 text-xs">Open Chart</Button>
                          </Link>
                          {apt.status !== 'in_progress' && apt.status !== 'completed' && (
                            <Link href={`/patients/${apt.patientId}/encounters/new?appointmentId=${apt.id}`}>
                              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700">Start Visit</Button>
                            </Link>
                          )}
                          {apt.status === 'in_progress' && (
                            <Link href={`/patients/${apt.patientId}/encounters/new?appointmentId=${apt.id}`}>
                              <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600">Resume</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar Column - 1/3 width — client component for interactive state */}
        <DashboardSidebar tasks={tasks} pendingLabs={pendingLabs} patients={patients} />
      </div>
    </div>
  );
}
