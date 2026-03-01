import { getAppointments, getPendingLabOrders, getOpenTasks, getPatients } from "@/lib/data/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Activity, FileText, CheckCircle2, AlertCircle, Users } from "lucide-react";
import Link from "next/link";
import { calculateAge } from "@/lib/utils";

export default async function DashboardPage() {
  const appointments = await getAppointments();
  // Filter for today's schedule
  const todaysSchedule = appointments.filter(a => a.date === "2026-03-01").sort((a, b) => a.time.localeCompare(b.time));
  
  const pendingLabs = await getPendingLabOrders();
  const tasks = await getOpenTasks();
  
  // Just loading all patients for now to get names - in a real app, use joins or targeted fetches
  const patients = await getPatients();
  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name.full || "Unknown Patient";
  const getPatientMetadata = (id: string) => {
    const p = patients.find(pat => pat.id === id);
    if (!p) return null;
    return { age: calculateAge(p.dob), sex: p.sex };
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'waiting': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">Waiting</Badge>;
      case 'in_progress': return <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      case 'scheduled': return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">Scheduled</Badge>;
      default: return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sunday, March 1, 2026</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Schedule Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Today's Schedule
                </CardTitle>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                  {todaysSchedule.length} Appointments
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
                      <div key={apt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                        <div className="flex items-start gap-4">
                          <div className="w-16 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 text-slate-700">
                            <span className="text-sm font-semibold">{apt.time}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Link href={`/patients/${apt.patientId}`} className="font-semibold text-base text-slate-900 hover:text-blue-600 transition-colors">
                                {getPatientName(apt.patientId)}
                              </Link>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="text-sm text-slate-500 mb-2">
                              {patientMeta?.age}y • {patientMeta?.sex.charAt(0).toUpperCase()}{patientMeta?.sex.slice(1)} • {apt.visitType} - {apt.reason}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {apt.room}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/patients/${apt.patientId}`}>
                            <Button variant="outline" size="sm" className="h-8">Open Chart</Button>
                          </Link>
                          {apt.status !== 'in_progress' && apt.status !== 'completed' && (
                            <Link href={`/patients/${apt.patientId}/encounters/new?appointmentId=${apt.id}`}>
                              <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">Start Visit</Button>
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

        {/* Right Sidebar Column - 1/3 width */}
        <div className="space-y-6">
          
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Tasks & Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No pending tasks.</div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-1">
                        <Link href={task.relatedPatientId ? `/patients/${task.relatedPatientId}` : '#'} className="font-medium text-sm hover:underline hover:text-blue-600 line-clamp-1">
                          {task.title}
                        </Link>
                        {task.priority === 'high' && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] uppercase">High</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Due: {task.dueDate}</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-blue-600">Resolve</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-indigo-500" />
                Pending Labs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {pendingLabs.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No pending lab results to review.</div>
                ) : (
                  pendingLabs.map(lab => (
                    <div key={lab.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/patients/${lab.patientId}`} className="font-medium text-sm hover:underline hover:text-blue-600">
                          {getPatientName(lab.patientId)}
                        </Link>
                        {lab.priority === 'urgent' && <Badge className="bg-red-50 text-red-700 border-red-200 text-[10px] uppercase">Urgent</Badge>}
                      </div>
                      <div className="text-xs text-slate-500 mb-2">
                        {lab.tests.length} tests pending review • Ordered {lab.createdAt.split('T')[0]}
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs h-7">Review Results</Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-emerald-500" />
                Recent Patients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4 text-sm">
                {patients.slice(0, 3).map(p => (
                   <Link key={p.id} href={`/patients/${p.id}`} className="flex items-center justify-between hover:bg-slate-50 p-2 -mx-2 rounded-md transition-colors">
                     <span className="font-medium">{p.name.full}</span>
                     <span className="text-muted-foreground text-xs">{p.mrn}</span>
                   </Link>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
