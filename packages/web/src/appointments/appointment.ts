import type { QueueStage } from "../flow/stages";
import { getTodayString } from "../format";

/** An appointment as the API returns it (the subset the staff portals read). */
export interface FhirAppointment {
  resourceType: "Appointment";
  id: string;
  meta?: { lastUpdated?: string };
  status: string;
  start?: string;
  end?: string;
  serviceType?: Array<{ coding?: Array<{ code?: string }> }>;
  reasonCode?: Array<{ text?: string }>;
  description?: string;
  comment?: string;
  participant?: Array<{
    actor?: { reference?: string };
    status?: string;
  }>;
  extension?: Array<{
    url: string;
    valueInteger?: number;
    valueBoolean?: boolean;
    valueString?: string;
  }>;
}

/** An appointment as the staff portals show it: a local day and clock time, the people, and where it is in the flow. */
export interface Appointment {
  id: string;
  /** The local calendar day, YYYY-MM-DD, comparable with `getTodayString()`. */
  date: string;
  /** The local clock time, HH:MM. */
  time: string;
  doctorId: string;
  patientId: string;
  reason: string;
  visitType: string;
  status: "scheduled" | "not_arrived" | "arrived" | "waiting" | "in_progress" | "completed" | "cancelled" | "no_show";
  room: string;
  notes: string;
  queueStage: QueueStage | null;
  /** Last change to the appointment, which is about when it entered its current stage. */
  stageSince: string | null;
}

const STATUS_OF: Record<string, Appointment["status"]> = {
  booked: "scheduled",
  pending: "scheduled",
  arrived: "arrived",
  fulfilled: "completed",
  cancelled: "cancelled",
  noshow: "no_show",
  "entered-in-error": "cancelled",
  waitlist: "waiting",
  "checked-in": "arrived",
};

// Every FHIR status the API may hold; "proposed" has no entry above, so it reads as scheduled.
const FHIR_STATUSES = ["proposed", ...Object.keys(STATUS_OF)];

/** How a FHIR appointment status reads in the portals; anything unknown is scheduled. */
export const appointmentStatusOf = (fhirStatus: string): Appointment["status"] => STATUS_OF[fhirStatus] ?? "scheduled";

/** The FHIR statuses that read as `status`, for asking the API for them. */
export const fhirAppointmentStatusesOf = (status: Appointment["status"]) =>
  FHIR_STATUSES.filter(fhirStatus => appointmentStatusOf(fhirStatus) === status);

const QUEUE_STAGE_URL = "urn:curo:queueStage";

// The id after "Patient/" or "Practitioner/" in the first participant of that kind.
function participantId(fhir: FhirAppointment, kind: "Patient" | "Practitioner"): string {
  const prefix = `${kind}/`;
  const reference = fhir.participant?.find(p => p.actor?.reference?.startsWith(prefix))?.actor?.reference;
  return reference?.slice(prefix.length) ?? "";
}

export function mapFhirAppointment(fhir: FhirAppointment): Appointment {
  const start = fhir.start ? new Date(fhir.start) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    id: fhir.id,
    date: getTodayString(start),
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    doctorId: participantId(fhir, "Practitioner"),
    patientId: participantId(fhir, "Patient"),
    reason: fhir.reasonCode?.[0]?.text ?? fhir.description ?? "",
    visitType: fhir.serviceType?.[0]?.coding?.[0]?.code ?? "",
    status: appointmentStatusOf(fhir.status),
    room: "",
    notes: fhir.comment ?? "",
    queueStage: (fhir.extension?.find(e => e.url === QUEUE_STAGE_URL)?.valueString as QueueStage | undefined) ?? null,
    stageSince: fhir.meta?.lastUpdated ?? null,
  };
}
