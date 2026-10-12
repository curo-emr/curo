import type { PersonName } from '@curo/web/fhir';
import type { DoctorSession } from '@curo/web/schedule';
import type { QueueStage } from '@curo/web/flow';

export type { Allergy, Insurance, Patient } from '@curo/web/fhir';
// Where a checked-in patient is in the day's flow (nurse triage → doctor).
export type { QueueStage };
export type { Appointment } from '@curo/web/appointments';

export interface Doctor {
  id: string;
  name: PersonName;
  specialty: string;
  phone: string;
  email: string;
  /** When the doctor sees patients; none until an administrator sets them. */
  sessions: DoctorSession[];
}
