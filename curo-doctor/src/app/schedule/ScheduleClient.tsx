"use client";

import { useState, useMemo } from "react";
import { Appointment, Patient } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, User, FileText } from "lucide-react";
import Link from "next/link";
import { calculateAge, cn } from "@/lib/utils";
import { ScheduleCalendar } from "./ScheduleCalendar";

interface Props {
  appointments: Appointment[];
  patients: Patient[];
}

export function ScheduleClient({ appointments, patients }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date("2026-03-01"));

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name.full || "Unknown Patient";
  const getPatientMetadata = (id: string) => {
    const p = patients.find(pat => pat.id === id);
    if (!p) return null;
    return { age: calculateAge(p.dob), sex: p.sex };
  };

  const formattedSelectedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  
  const dailyAppointments = useMemo(() => {
    return appointments
      .filter(a => a.date === formattedSelectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, formattedSelectedDate]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'waiting': return <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">Waiting</Badge>;
      case 'in_progress': return <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>;
      case 'completed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Completed</Badge>;
      case 'scheduled': return <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50">Scheduled</Badge>;
      default: return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
    }
  };

  const handlePreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Schedule</h1>
          <p className="text-sm text-muted-foreground">Manage and view your upcoming appointments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Monthly Calendar */}
        <div className="lg:col-span-1">
          <ScheduleCalendar 
            appointments={appointments} 
            selectedDate={selectedDate} 
            onDateSelect={(date) => setSelectedDate(date)} 
          />
        </div>

        {/* Right Column - Daily Schedule List */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200 h-full">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-sm">
                    {dailyAppointments.length} Visits
                  </Badge>
                  <div className="flex bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden h-8">
                    <button onClick={handlePreviousDay} className="px-3 text-slate-600 hover:bg-slate-50 border-r border-slate-200 text-sm font-medium transition-colors">Prev</button>
                    <button onClick={() => setSelectedDate(new Date("2026-03-01"))} className="px-3 text-slate-600 hover:bg-slate-50 border-r border-slate-200 text-sm font-medium transition-colors">Today</button>
                    <button onClick={handleNextDay} className="px-3 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">Next</button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {dailyAppointments.length === 0 ? (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center">
                    <CalendarIcon className="h-16 w-16 text-slate-200 mb-4" />
                    <p className="text-lg font-medium text-slate-700">No appointments scheduled.</p>
                    <p className="mt-1">Enjoy your free time or select another date.</p>
                  </div>
                ) : (
                  dailyAppointments.map(apt => {
                    const patientMeta = getPatientMetadata(apt.patientId);
                    return (
                      <div key={apt.id} className="p-5 sm:p-6 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 sm:items-center justify-between group">
                        <div className="flex items-start gap-4 sm:gap-6">
                          <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center p-2 sm:p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-100">
                            <span className="text-base sm:text-lg font-bold">{apt.time}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <Link href={`/patients/${apt.patientId}`} className="text-lg sm:text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors">
                                {getPatientName(apt.patientId)}
                              </Link>
                              {getStatusBadge(apt.status)}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                              <span className="flex items-center gap-1"><User className="h-4 w-4 text-slate-400" /> {patientMeta?.age}y, {patientMeta?.sex.charAt(0).toUpperCase()}{patientMeta?.sex.slice(1)}</span>
                              <span className="flex items-center gap-1"><FileText className="h-4 w-4 text-slate-400" /> {apt.visitType} - {apt.reason}</span>
                              <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-slate-400" /> Room: {apt.room || 'TBD'}</span>
                            </div>
                            {apt.notes && (
                              <div className="text-sm text-slate-500 bg-white p-2.5 rounded-md border border-slate-200 max-w-xl shadow-sm mt-3">
                                <span className="font-semibold text-slate-700">Note: </span>{apt.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 mt-4 sm:mt-0 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                          <Link href={`/patients/${apt.patientId}`} className="shrink-0">
                            <Button variant="outline" className="w-full sm:justify-start">Open Chart</Button>
                          </Link>
                          {apt.status !== 'in_progress' && apt.status !== 'completed' && (
                            <Link href={`/patients/${apt.patientId}/encounters/new?appointmentId=${apt.id}`} className="shrink-0">
                              <Button className="w-full sm:justify-start bg-blue-600 hover:bg-blue-700 text-white">Start Visit</Button>
                            </Link>
                          )}
                          {apt.status === 'in_progress' && (
                            <Link href={`/patients/${apt.patientId}/encounters/new?appointmentId=${apt.id}`} className="shrink-0">
                              <Button className="w-full sm:justify-start bg-amber-500 hover:bg-amber-600 text-white">Resume Visit</Button>
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
      </div>
    </div>
  );
}
