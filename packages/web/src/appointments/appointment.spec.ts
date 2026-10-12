import {
  appointmentStatusOf, fhirAppointmentStatusesOf, isClosedAppointmentStatus, mapFhirAppointment, nextAppointmentStatuses,
  type FhirAppointment,
} from "./appointment";

// Starts are built from local dates, so these pass in any time zone.
const fhir = (overrides: Partial<FhirAppointment> = {}): FhirAppointment => ({
  resourceType: "Appointment",
  id: "a1",
  status: "booked",
  start: new Date(2026, 9, 12, 9, 5).toISOString(),
  participant: [
    { actor: { reference: "Patient/p1" } },
    { actor: { reference: "Practitioner/d1" } },
  ],
  ...overrides,
});

describe("mapFhirAppointment", () => {
  it("maps the people, the visit and the notes", () => {
    const appointment = mapFhirAppointment(fhir({
      reasonCode: [{ text: "Fever" }],
      serviceType: [{ coding: [{ code: "follow_up" }] }],
      comment: "Bring old reports",
    }));
    expect(appointment).toMatchObject({
      id: "a1",
      patientId: "p1",
      doctorId: "d1",
      reason: "Fever",
      visitType: "follow_up",
      status: "scheduled",
      room: "",
      notes: "Bring old reports",
      queueStage: null,
      stageSince: null,
    });
  });

  it("reads the start on the local calendar and clock", () => {
    expect(mapFhirAppointment(fhir())).toMatchObject({ date: "2026-10-12", time: "09:05" });
    // Early morning stays on its own day (not the UTC one) and midnight reads 00, not 24.
    const early = mapFhirAppointment(fhir({ start: new Date(2026, 9, 12, 0, 30).toISOString() }));
    expect(early).toMatchObject({ date: "2026-10-12", time: "00:30" });
  });

  it("falls back to the description for the reason, and to empty ids without participants", () => {
    const appointment = mapFhirAppointment(fhir({ description: "Check-up", participant: undefined }));
    expect(appointment).toMatchObject({ reason: "Check-up", patientId: "", doctorId: "" });
  });

  it("reads the queue stage and when it last changed", () => {
    const appointment = mapFhirAppointment(fhir({
      meta: { lastUpdated: "2026-10-12T03:40:00Z" },
      extension: [{ url: "urn:curo:queueStage", valueString: "with_nurse" }],
    }));
    expect(appointment).toMatchObject({ queueStage: "with_nurse", stageSince: "2026-10-12T03:40:00Z" });
  });
});

describe("appointmentStatusOf", () => {
  it.each([
    ["booked", "scheduled"], ["pending", "scheduled"], ["proposed", "scheduled"],
    ["arrived", "arrived"], ["checked-in", "arrived"],
    ["fulfilled", "completed"],
    ["cancelled", "cancelled"], ["entered-in-error", "cancelled"],
    ["noshow", "no_show"],
    ["waitlist", "waiting"],
    ["something-new", "scheduled"],
  ])("%s reads as %s", (fhirStatus, status) => {
    expect(appointmentStatusOf(fhirStatus)).toBe(status);
  });
});

describe("fhirAppointmentStatusesOf", () => {
  it("lists every FHIR status that reads as the given one", () => {
    expect(fhirAppointmentStatusesOf("scheduled").sort()).toEqual(["booked", "pending", "proposed"]);
    expect(fhirAppointmentStatusesOf("cancelled").sort()).toEqual(["cancelled", "entered-in-error"]);
    expect(fhirAppointmentStatusesOf("in_progress")).toEqual([]);
  });
});

describe("nextAppointmentStatuses", () => {
  it("checks in, cancels or misses a booking, and completes or cancels a checked-in visit", () => {
    expect(nextAppointmentStatuses("scheduled")).toEqual(["arrived", "cancelled", "no_show"]);
    expect(nextAppointmentStatuses("arrived")).toEqual(["completed", "cancelled"]);
  });

  it("offers nothing once the appointment is closed", () => {
    for (const status of ["completed", "cancelled", "no_show"] as const) {
      expect(nextAppointmentStatuses(status)).toEqual([]);
      expect(isClosedAppointmentStatus(status)).toBe(true);
    }
    expect(isClosedAppointmentStatus("arrived")).toBe(false);
  });
});
