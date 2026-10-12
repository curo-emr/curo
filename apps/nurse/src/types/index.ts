// Where a checked-in patient is in the day's flow (nurse triage → doctor).
import type { QueueStage } from "@curo/web/flow";

export type { QueueStage };
export type { Appointment } from "@curo/web/appointments";
export type { Vitals } from "@curo/web/clinical";
export type { Allergy, Patient } from "@curo/web/fhir";

export interface Problem {
  id: string;
  patientId: string;
  icdCode: string;
  name: string;
  status: 'active' | 'resolved' | 'inactive';
  onsetDate: string;
  notes: string;
}
