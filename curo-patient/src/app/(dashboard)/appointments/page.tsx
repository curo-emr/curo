"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, getTodayString } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getMyAppointments } from "@/lib/api/patient-portal";
import type { Appointment } from "@/types";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyAppointments().then(setAppointments).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  const doctors: never[] = [];
  const today = getTodayString();
  const upcoming = appointments.filter(a => a.date >= today && a.status === "scheduled");
  const past = appointments.filter(a => a.date < today || a.status === "completed" || a.status === "cancelled" || a.status === "no_show");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Appointments"
        description="View your upcoming and past appointments."
      />

      {/* Upcoming Appointments */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming
            </CardTitle>
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                {upcoming.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {upcoming.length === 0 ? (
              <EmptyState message="No upcoming appointments scheduled." />
            ) : (
              upcoming
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map(apt => (
                <div key={apt.id} className="p-4 hover:bg-muted transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-20 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-primary/10 text-primary">
                      <span className="text-xs font-medium">{formatDate(apt.date)}</span>
                      <span className="text-sm font-semibold">{formatTime(apt.time)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-foreground">{apt.reason}</p>
                        <StatusBadge status={apt.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(apt.doctorId, doctors)}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{apt.visitType}</span>
                        {apt.room && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {apt.room}
                          </span>
                        )}
                      </div>
                      {apt.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{apt.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Past Appointments */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              Past Appointments
            </CardTitle>
            {past.length > 0 && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
                {past.length}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {past.length === 0 ? (
              <EmptyState message="No past appointments." />
            ) : (
              past.map(apt => (
                <div key={apt.id} className="p-4 hover:bg-muted transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-20 shrink-0 flex flex-col items-center justify-center p-2 rounded-lg bg-muted text-muted-foreground">
                      <span className="text-xs font-medium">{formatDate(apt.date)}</span>
                      <span className="text-sm font-semibold">{formatTime(apt.time)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-foreground">{apt.reason}</p>
                        <StatusBadge status={apt.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getDoctorName(apt.doctorId, doctors)} &middot; {apt.visitType}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
