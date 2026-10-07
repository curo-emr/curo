"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Patient, Doctor, Appointment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@curo/web/ui/card";
import { Button } from "@curo/web/ui/button";
import { Input } from "@curo/web/ui/input";
import { Label } from "@curo/web/ui/label";
import { Textarea } from "@curo/web/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@curo/web/ui/select";
import { SearchInput } from "@curo/web/ui/search-input";
import {
  User,
  Stethoscope,
  CalendarDays,
  Clock,
  FileText,
  Loader2,
  Check,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { cn, formatTime } from "@/lib/utils";
import { ROUTES, VISIT_TYPES } from "@/lib/constants";
import { bookNewAppointment } from "@/lib/actions/appointment-actions";
import { toast } from "sonner";

interface BookAppointmentFormProps {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
}

function generateTimeSlots(start: string, end: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  while (currentMinutes + durationMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += durationMinutes;
  }

  return slots;
}

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function BookAppointmentForm({ patients, doctors, appointments }: BookAppointmentFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(preselectedPatientId);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [visitType, setVisitType] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Filter patients based on search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase().trim();
    return patients
      .filter(
        (p) =>
          p.name.full.toLowerCase().includes(q) ||
          p.mrn.toLowerCase().includes(q) ||
          p.nic.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [patientSearch, patients]);

  // Generate time slots for selected doctor
  const timeSlots = useMemo(() => {
    if (!selectedDoctor) return [];
    return generateTimeSlots(
      selectedDoctor.workingHours.start,
      selectedDoctor.workingHours.end,
      selectedDoctor.slotDurationMinutes
    );
  }, [selectedDoctor]);

  // Check which slots are booked
  const bookedSlots = useMemo(() => {
    if (!selectedDoctorId || !selectedDate) return new Set<string>();
    return new Set(
      appointments
        .filter(
          (a) =>
            a.doctorId === selectedDoctorId &&
            a.date === selectedDate &&
            a.status !== "cancelled"
        )
        .map((a) => a.time)
    );
  }, [appointments, selectedDoctorId, selectedDate]);

  // Check if selected date is a valid day for the doctor
  const isValidDay = useMemo(() => {
    if (!selectedDoctor || !selectedDate) return true;
    const dayName = getDayName(selectedDate);
    return selectedDoctor.availableDays.includes(dayName);
  }, [selectedDoctor, selectedDate]);

  const handleSubmit = () => {
    if (!selectedPatientId || !selectedDoctorId || !selectedDate || !selectedTime || !visitType || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    startTransition(async () => {
      const result = await bookNewAppointment({
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        date: selectedDate,
        time: selectedTime,
        visitType,
        reason,
        notes,
      });

      if (result.success) {
        toast.success("Appointment booked successfully");
        router.push(ROUTES.APPOINTMENTS);
      } else {
        const err = (result as { success: false; error?: string | Record<string, string[]> }).error;
        const errorMsg =
          typeof err === "string"
            ? err
            : Object.values(err || {}).flat().join(", ");
        toast.error(errorMsg || "Failed to book appointment");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Patient Selection */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Patient Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {selectedPatient ? (
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/15">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold">
                  {selectedPatient.name.first?.charAt(0)}
                  {selectedPatient.name.last?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedPatient.name.full}</p>
                  <p className="text-sm text-muted-foreground">
                    MRN: {selectedPatient.mrn} | NIC: {selectedPatient.nic}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPatientId("");
                  setPatientSearch("");
                }}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <SearchInput
                value={patientSearch}
                onChange={(val) => {
                  setPatientSearch(val);
                  setShowPatientDropdown(true);
                }}
                placeholder="Search by patient name, MRN, or NIC..."
                autoFocus
              />
              {showPatientDropdown && filteredPatients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-muted border-b border last:border-b-0 transition-colors"
                      onClick={() => {
                        setSelectedPatientId(p.id);
                        setPatientSearch("");
                        setShowPatientDropdown(false);
                      }}
                    >
                      <p className="font-medium text-foreground">{p.name.full}</p>
                      <p className="text-xs text-muted-foreground">
                        MRN: {p.mrn} | NIC: {p.nic}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {showPatientDropdown && patientSearch.trim() && filteredPatients.length === 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border rounded-lg shadow-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">No patients found.</p>
                  <Link href={ROUTES.NEW_PATIENT} className="text-sm text-primary hover:underline mt-1 inline-block">
                    Register new patient
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Doctor Selection */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Stethoscope className="h-5 w-5 text-primary" />
            Doctor Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctors.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={cn(
                  "p-4 rounded-lg border-2 text-left transition-all",
                  selectedDoctorId === doc.id
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                    : "border hover:border-muted-foreground hover:bg-muted"
                )}
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setSelectedTime("");
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{doc.name.full}</p>
                    <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                  </div>
                  {selectedDoctorId === doc.id && (
                    <div className="bg-primary rounded-full p-0.5">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  Room {doc.roomNumber}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Date & Time */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5 text-primary" />
            Date & Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointment-date">Appointment Date</Label>
            <Input
              id="appointment-date"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime("");
              }}
              className="max-w-xs"
            />
            {selectedDoctor && (
              <p className="text-xs text-muted-foreground">
                Available days: {selectedDoctor.availableDays.join(", ")}
              </p>
            )}
          </div>

          {selectedDate && !isValidDay && selectedDoctor && (
            <div className="p-3 bg-status-warning-bg border border-status-warning-border rounded-lg text-sm text-status-warning-text">
              Dr. {selectedDoctor.name.full} is not available on{" "}
              {getDayName(selectedDate)}s. Please select a different date.
            </div>
          )}

          {selectedDate && isValidDay && selectedDoctor && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Available Time Slots
              </Label>
              {timeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time slots available. Please select a doctor first.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {timeSlots.map((slot) => {
                    const isBooked = bookedSlots.has(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <Button
                        key={slot}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBooked}
                        className={cn(
                          "h-10 text-sm font-medium transition-all",
                          isSelected
                            ? "bg-primary text-white border-primary hover:bg-primary/90 hover:text-white"
                            : isBooked
                            ? "bg-muted text-muted-foreground border cursor-not-allowed"
                            : "bg-white text-foreground border hover:bg-primary/10 hover:border-primary/20"
                        )}
                        onClick={() => setSelectedTime(slot)}
                      >
                        {isBooked ? "Booked" : formatTime(slot)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Visit Details */}
      <Card className="shadow-sm border">
        <CardHeader className="bg-muted/50 border-b border">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visit-type">Visit Type</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger id="visit-type" className="max-w-xs">
                <SelectValue placeholder="Select visit type" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Visit <span className="text-status-error-text">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this appointment..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push(ROUTES.APPOINTMENTS)}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={handleSubmit}
          disabled={
            isPending ||
            !selectedPatientId ||
            !selectedDoctorId ||
            !selectedDate ||
            !selectedTime ||
            !visitType ||
            !reason
          }
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Booking...
            </>
          ) : (
            "Book Appointment"
          )}
        </Button>
      </div>
    </div>
  );
}
