"use client";

import { useState, useMemo, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@curo/web/hooks";
import type { Patient, Doctor } from "@/types";
import { Button } from "@curo/web/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@curo/web/ui/field";
import { InitialsAvatar } from "@curo/web/ui/initials-avatar";
import { Input } from "@curo/web/ui/input";
import { SectionCard } from "@curo/web/ui/section-card";
import { Textarea } from "@curo/web/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@curo/web/ui/select";
import { SearchInput } from "@curo/web/ui/search-input";
import { User, Stethoscope, CalendarDays, FileText, Loader2, Check, MapPin } from "lucide-react";
import Link from "next/link";
import { cn, formatTime, getTodayString } from "@/lib/utils";
import { ROUTES, VISIT_TYPES } from "@/lib/constants";
import { isMissed } from "@/lib/queue";
import { bookNewAppointment } from "@/lib/actions/appointment-actions";
import { toast } from "sonner";
import { appointmentQueries, invalidateAppointments, patientQueries } from "@/lib/queries";

interface BookAppointmentFormProps {
  doctors: Doctor[];
}

/** How many patients the search shows. */
const PATIENT_MATCHES = 8;
const NO_PATIENTS: Patient[] = [];

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

/** How the desk tells patients apart: MRN, then NIC or PHN when there is one. */
const patientIds = (p: Patient) => [p.mrn, p.nic ? `NIC ${p.nic}` : p.phn ? `PHN ${p.phn}` : ""].filter(Boolean).join(" · ");

function getDayName(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function BookAppointmentForm({ doctors }: BookAppointmentFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") || "";

  const [patientSearch, setPatientSearch] = useState("");
  // A patient named in the link (from their record) starts selected, until another is picked or it's cleared.
  const preselected = useQuery({ ...patientQueries.detail(preselectedPatientId), enabled: !!preselectedPatientId }).data;
  const [picked, setPicked] = useState<Patient | null>();
  const selectedPatient = picked === undefined ? preselected ?? null : picked;
  const selectedPatientId = selectedPatient?.id ?? "";
  // The schedule's "Book this day" can name the doctor and the date; a past date isn't offered.
  const [selectedDoctorId, setSelectedDoctorId] = useState(() => searchParams.get("doctorId") ?? "");
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = searchParams.get("date") ?? "";
    return date >= getTodayString() ? date : "";
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [visitType, setVisitType] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // Patients matching the search, found on the server.
  const search = useDebouncedValue(patientSearch).trim();
  const matches = useQuery({ ...patientQueries.search(search, PATIENT_MATCHES), enabled: !!search });
  const searchDone = !!search && !!matches.data;
  const filteredPatients = search ? matches.data ?? NO_PATIENTS : NO_PATIENTS;

  // Generate time slots for selected doctor
  const timeSlots = useMemo(() => {
    if (!selectedDoctor) return [];
    return generateTimeSlots(
      selectedDoctor.workingHours.start,
      selectedDoctor.workingHours.end,
      selectedDoctor.slotDurationMinutes
    );
  }, [selectedDoctor]);

  // The doctor's booked slots that day, from their schedule.
  const schedule = useQuery({
    ...appointmentQueries.schedule(selectedDoctorId, selectedDate),
    enabled: !!selectedDoctorId && !!selectedDate,
  });
  const bookedSlots = useMemo(
    // Cancelled and no-show appointments free their slot, as on the server.
    () => new Set(schedule.data?.filter((a) => !isMissed(a)).map((a) => a.time)),
    [schedule.data],
  );

  // Whether the doctor works on the chosen day. With no working days on record, any day is offered.
  const isValidDay =
    !selectedDoctor || !selectedDate || selectedDoctor.availableDays.length === 0 ||
    selectedDoctor.availableDays.includes(getDayName(selectedDate));

  // The date picker's `min` stops picking a past day; a typed one is caught here.
  const complete = !!(selectedPatientId && selectedDoctorId && selectedDate >= getTodayString() && selectedTime && visitType && reason.trim());

  const handleSubmit = () => {
    if (!complete) {
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
        void invalidateAppointments(queryClient);
        toast.success("Appointment booked successfully");
        router.push(ROUTES.APPOINTMENTS);
      } else {
        toast.error(result.error || "Failed to book appointment");
        // Someone may have just taken the slot: show the doctor's day as it is now.
        void invalidateAppointments(queryClient);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* overflow-visible: the search results drop down past the card's edge. */}
      <SectionCard icon={User} iconClassName="text-primary" title="Patient" className="overflow-visible">
        {selectedPatient ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/15 bg-primary/5 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <InitialsAvatar name={selectedPatient.name.full} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{selectedPatient.name.full}</p>
                <p className="truncate font-mono text-xs text-muted-foreground">{patientIds(selectedPatient)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPicked(null);
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
              placeholder="Search by name, MRN, NIC or phone…"
              autoFocus
            />
            {showPatientDropdown && filteredPatients.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border bg-popover shadow-lg">
                {filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted"
                    onClick={() => {
                      setPicked(p);
                      setPatientSearch("");
                      setShowPatientDropdown(false);
                    }}
                  >
                    <InitialsAvatar name={p.name.full} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-foreground">{p.name.full}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{patientIds(p)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showPatientDropdown && matches.isError && !matches.data && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-4 text-center text-sm text-status-error-text shadow-lg">
                Couldn&apos;t search patients. Check your connection and try again.
              </div>
            )}
            {showPatientDropdown && searchDone && filteredPatients.length === 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover p-4 text-center shadow-lg">
                <p className="text-sm text-muted-foreground">No patients found.</p>
                <Link href={ROUTES.NEW_PATIENT} className="mt-1 inline-block text-sm text-primary hover:underline">
                  Register a new patient
                </Link>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={Stethoscope} iconClassName="text-primary" title="Doctor">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {doctors.map((doc) => {
            const selected = selectedDoctorId === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted",
                )}
                onClick={() => {
                  setSelectedDoctorId(doc.id);
                  setSelectedTime("");
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">Dr. {doc.name.full}</p>
                    <p className="text-sm text-muted-foreground">{doc.specialty}</p>
                  </div>
                  {selected && (
                    <span className="rounded-full bg-primary p-0.5 text-primary-foreground">
                      <Check className="size-3.5" />
                    </span>
                  )}
                </div>
                {doc.roomNumber && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> Room {doc.roomNumber}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard icon={CalendarDays} iconClassName="text-primary" title="Date and time">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="appointment-date">Date</FieldLabel>
            <Input
              id="appointment-date"
              type="date"
              min={getTodayString()}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime("");
              }}
              className="max-w-xs"
            />
            {selectedDoctor && selectedDoctor.availableDays.length > 0 && (
              <FieldDescription>Dr. {selectedDoctor.name.full} works {selectedDoctor.availableDays.join(", ")}.</FieldDescription>
            )}
          </Field>

          {selectedDate && !isValidDay && selectedDoctor && (
            <p className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-status-warning-text">
              Dr. {selectedDoctor.name.full} doesn&apos;t work on {getDayName(selectedDate)}s. Pick another date.
            </p>
          )}

          {!selectedDoctor && <p className="text-sm text-muted-foreground">Pick a doctor to see their free times.</p>}

          {selectedDate && isValidDay && selectedDoctor && (
            <Field>
              <FieldLabel>Time</FieldLabel>
              {timeSlots.length === 0 ? (
                <FieldDescription>Dr. {selectedDoctor.name.full} has no working hours set.</FieldDescription>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {timeSlots.map((slot) => {
                    const isBooked = bookedSlots.has(slot);
                    return (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTime === slot ? "default" : "outline"}
                        size="sm"
                        disabled={isBooked}
                        title={isBooked ? "Already booked" : undefined}
                        className={cn("h-10 tabular-nums", isBooked && "line-through")}
                        onClick={() => setSelectedTime(slot)}
                      >
                        {formatTime(slot)}
                      </Button>
                    );
                  })}
                </div>
              )}
              {timeSlots.length > 0 && <FieldDescription>Crossed-out times are already booked.</FieldDescription>}
            </Field>
          )}
        </FieldGroup>
      </SectionCard>

      <SectionCard icon={FileText} iconClassName="text-primary" title="Visit">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="visit-type">Visit type</FieldLabel>
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
          </Field>
          <Field>
            <FieldLabel htmlFor="reason">Reason for the visit</FieldLabel>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What the patient is coming in for"
              rows={3}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">Notes for the doctor (optional)</FieldLabel>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </FieldGroup>
      </SectionCard>

      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push(ROUTES.APPOINTMENTS)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending || !complete}>
          {isPending && <Loader2 className="animate-spin" />}
          {isPending ? "Booking…" : "Book appointment"}
        </Button>
      </div>
    </div>
  );
}
