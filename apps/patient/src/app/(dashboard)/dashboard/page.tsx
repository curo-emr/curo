"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Pill, FlaskConical, HeartPulse, AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Badge } from "@curo/web/ui/badge";
import { Button } from "@curo/web/ui/button";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { StatusBadge } from "@curo/web/ui/status-badge";
import { getMyProfile, getMyAppointments, getMyAllergies, getMyConditions, getMyPrescriptions, getMyLabOrders } from "@/lib/api/patient-portal";
import type { Patient, Appointment, Allergy, Problem, Prescription, LabOrder } from "@/types";

export default function DashboardPage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyProfile().then(async pt => {
      if (!pt) { setIsLoading(false); return; }
      setPatient(pt);
      const [appts, alg, probs, rxs, labs] = await Promise.all([
        getMyAppointments(),
        getMyAllergies(pt.id),
        getMyConditions(pt.id),
        getMyPrescriptions(pt.id),
        getMyLabOrders(pt.id),
      ]);
      setAppointments(appts);
      setAllergies(alg);
      setProblems(probs);
      setPrescriptions(rxs);
      setLabOrders(labs);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!patient) return <div className="text-center py-12 text-muted-foreground">Patient data not found.</div>;

  const today = new Date().toISOString().split('T')[0];
  const upcomingAppts = appointments.filter(a => a.date >= today && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const activeProblems = problems.filter(p => p.status === "active");
  const pendingLabs = labOrders.filter(l => l.status === "results_pending" || l.status === "sent_to_lab");

  const dateHeading = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const statCards = [
    { label: "Upcoming Appointments", value: upcomingAppts.length, color: "text-primary bg-primary/10 border-primary/20", icon: Calendar },
    { label: "Active Conditions", value: activeProblems.length, color: "text-status-warning-text bg-status-warning-bg border-status-warning-border", icon: HeartPulse },
    { label: "Active Prescriptions", value: prescriptions.length, color: "text-status-success-text bg-status-success-bg border-status-success-border", icon: Pill },
    { label: "Pending Lab Results", value: pendingLabs.length, color: "text-indigo-700 bg-indigo-50 border-indigo-200", icon: FlaskConical },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, {patient.name.first}</h1>
        <p className="text-sm text-muted-foreground mt-1">{dateHeading}</p>
      </div>

      {allergies.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-status-error-border bg-status-error-bg">
          <AlertTriangle className="h-5 w-5 text-status-error-text mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-status-error-text">Known Allergies</p>
            <p className="text-sm text-status-error-text mt-0.5">{allergies.map(a => `${a.substance} (${a.severity})`).join(", ")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(stat => (
          <div key={stat.label} className={`rounded-lg border p-4 ${stat.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4 opacity-70" />
              <p className="text-xs font-medium opacity-80">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-primary" />Upcoming Appointments</CardTitle>
                <Link href={ROUTES.APPOINTMENTS}><Button variant="ghost" size="sm" className="text-xs text-primary">View All <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {upcomingAppts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No upcoming appointments.</div>
                ) : (
                  upcomingAppts.slice(0, 3).map(apt => (
                    <div key={apt.id} className="p-4 hover:bg-muted transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="w-16 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-primary/10 text-primary">
                            <span className="text-xs font-medium">{formatDate(apt.date).split(",")[0]}</span>
                            <span className="text-sm font-semibold">{formatTime(apt.time)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{apt.reason}</p>
                            <p className="text-sm text-muted-foreground mt-0.5">{apt.visitType}</p>
                          </div>
                        </div>
                        <StatusBadge status={apt.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-lg"><Pill className="h-5 w-5 text-status-success-text" />Recent Prescriptions</CardTitle>
                <Link href={ROUTES.PRESCRIPTIONS}><Button variant="ghost" size="sm" className="text-xs text-primary">View All <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {prescriptions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No prescriptions found.</div>
                ) : (
                  prescriptions.slice(0, 2).map(rx => (
                    <Link key={rx.id} href={ROUTES.PRESCRIPTION(rx.id)} className="block p-4 hover:bg-muted transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{rx.items.map(i => i.displayName).join(", ")}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(rx.createdAt)}</p>
                        </div>
                        <Badge variant="outline" className="text-status-success-text border-status-success-border bg-status-success-bg shrink-0">
                          {rx.items.length} item{rx.items.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/50 border-b pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2 text-base"><HeartPulse className="h-4 w-4 text-status-warning-text" />Active Conditions</CardTitle>
                {activeProblems.length > 0 && <Badge variant="secondary" className="bg-status-warning-bg text-status-warning-text">{activeProblems.length}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {activeProblems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">No active conditions.</p>
              ) : (
                <div className="space-y-3">
                  {activeProblems.map(p => (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Since {formatDate(p.onsetDate)}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{p.icdCode}</Badge>
                    </div>
                  ))}
                </div>
              )}
              <Link href={ROUTES.HEALTH_RECORDS} className="block mt-3">
                <Button variant="outline" size="sm" className="w-full text-xs">View Health Records</Button>
              </Link>
            </CardContent>
          </Card>

          {pendingLabs.length > 0 && (
            <Card className="shadow-sm border">
              <CardHeader className="bg-muted/50 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="h-4 w-4 text-indigo-500" />
                  Pending Lab Results
                  <Badge variant="secondary" className="ml-auto bg-indigo-50 text-indigo-700">{pendingLabs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {pendingLabs.map(lab => (
                    <div key={lab.id} className="text-sm">
                      <p className="font-medium">{lab.tests.length} test{lab.tests.length !== 1 ? "s" : ""} pending</p>
                      <p className="text-xs text-muted-foreground">Ordered {formatDate(lab.createdAt)}</p>
                    </div>
                  ))}
                </div>
                <Link href={ROUTES.LAB_REPORTS} className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full text-xs">View Lab Reports</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
