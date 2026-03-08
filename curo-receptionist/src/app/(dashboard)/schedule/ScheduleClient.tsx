"use client";

import { useState, useMemo } from "react";
import { Appointment, Patient, Doctor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  Activity,
  CalendarPlus,
} from "lucide-react";
import Link from "next/link";
import {
  cn,
  getTodayString,
  getPatientName,
  getPatientMeta,
  getStatusBorderClass,
  formatTime,
} from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScheduleCalendar } from "./ScheduleCalendar";

interface Props {
  appointments: Appointment[];
  patients: Patient[];
  doctors: Doctor[];
}

export function ScheduleClient({ appointments, patients, doctors }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [doctorFilter, setDoctorFilter] = useState("all");

  const formattedSelectedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
  const todayStr = getTodayString();
  const isToday = formattedSelectedDate === todayStr;

  const dailyAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const matchesDate = a.date === formattedSelectedDate;
        const matchesDoctor = doctorFilter === "all" || a.doctorId === doctorFilter;
        return matchesDate && matchesDoctor;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, formattedSelectedDate, doctorFilter]);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Doctor Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">View doctor availability and scheduled appointments.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Doctor Filter */}
          <Select value={doctorFilter} onValueChange={setDoctorFilter}>
            <SelectTrigger className="w-[200px] bg-white border-slate-200 shadow-sm">
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

          {/* Day Navigation */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePreviousDay} className="h-8 w-8 text-slate-600 hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={isToday ? "default" : "ghost"}
              className={cn(
                "h-8 px-3 text-sm font-medium",
                isToday
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
              onClick={() => setSelectedDate(new Date())}
              disabled={isToday}
            >
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 text-slate-600 hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Left Column - Monthly Calendar */}
        <div className="lg:col-span-2">
          <ScheduleCalendar
            appointments={appointments}
            selectedDate={selectedDate}
            onDateSelect={(date) => setSelectedDate(date)}
          />
        </div>

        {/* Right Column - Daily Schedule List */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="shadow-sm border-slate-200 flex-1 flex flex-col bg-slate-50/30">
            <CardHeader className="bg-white border-b border-slate-200 pb-4 px-6 pt-6 rounded-t-xl">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <span className="bg-blue-100/50 p-2 rounded-lg">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </span>
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1 text-sm font-medium"
                  >
                    {dailyAppointments.length} Visit{dailyAppointments.length !== 1 ? "s" : ""}
                  </Badge>
                  <Link
                    href={`${ROUTES.NEW_APPOINTMENT}?date=${formattedSelectedDate}${doctorFilter !== "all" ? `&doctorId=${doctorFilter}` : ""}`}
                  >
                    <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <CalendarPlus className="h-4 w-4 mr-1" />
                      Book Slot
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="flex flex-col gap-4">
                {dailyAppointments.length === 0 ? (
                  <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center h-full bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                      <CalendarIcon className="h-10 w-10 text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-700">
                      No appointments on{" "}
                      {selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                    <p className="mt-1 text-sm">Select another date or book a new appointment.</p>
                  </div>
                ) : (
                  dailyAppointments.map((apt) => {
                    const patientMeta = getPatientMeta(apt.patientId, patients);
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "bg-white border border-slate-200 rounded-xl p-5 sm:p-6 transition-all hover:border-slate-300 hover:shadow-md flex flex-col sm:flex-row gap-5 sm:items-center justify-between group relative",
                          getStatusBorderClass(apt.status)
                        )}
                      >
                        <div className="flex items-start gap-5 sm:gap-6">
                          <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 text-slate-700 border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-900 group-hover:border-blue-100 transition-colors">
                            <span className="text-base sm:text-lg font-bold tracking-tight">
                              {formatTime(apt.time)}
                            </span>
                          </div>
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              <span className="text-lg sm:text-xl font-bold text-slate-900">
                                {getPatientName(apt.patientId, patients)}
                              </span>
                              <StatusBadge status={apt.status} />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
                              {patientMeta && (
                                <span className="flex items-center gap-1.5 font-medium">
                                  <User className="h-4 w-4 text-slate-400" /> {patientMeta.age}y,{" "}
                                  {patientMeta.sex.charAt(0).toUpperCase()}
                                  {patientMeta.sex.slice(1)}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5">
                                <Activity className="h-4 w-4 text-slate-400" /> {apt.visitType}
                                {apt.reason ? ` — ${apt.reason}` : ""}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-slate-400" />{" "}
                                {apt.room || "No Room Assigned"}
                              </span>
                            </div>
                            {apt.notes && (
                              <div className="text-sm text-slate-600 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 max-w-2xl mt-3 flex items-start gap-2">
                                <FileText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                <span>
                                  <span className="font-semibold text-slate-700">Note: </span>
                                  {apt.notes}
                                </span>
                              </div>
                            )}
                          </div>
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
