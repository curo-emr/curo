import { apiClient } from '@curo/web/api';
import type { Vitals } from '@/types';
import { VITAL_FIELDS, collapseVitals, type VitalObservation } from '@curo/web/clinical';

// Vitals already recorded for this visit (when a nurse re-opens triage).
export async function getVisitVitals(appointmentId: string): Promise<Partial<Vitals>> {
  const res = await apiClient.get<VitalObservation[]>('/vitals', { params: { appointmentId } });
  return collapseVitals(res.data ?? []);
}

// The patient's most recent value for each vital — shown as a reference while triaging.
export async function getLatestVitals(patientId: string): Promise<Partial<Vitals>> {
  const res = await apiClient.get<VitalObservation[]>(`/vitals/patient/${patientId}`);
  return collapseVitals(res.data ?? []);
}

// One FHIR Observation per field, linked to the appointment so the doctor sees it for this visit.
export async function recordVitals(
  patientId: string,
  appointmentId: string,
  vitals: Partial<Vitals>,
  keys: (keyof Vitals)[],
): Promise<void> {
  const effectiveDateTime = new Date().toISOString();
  await Promise.all(
    VITAL_FIELDS.filter(f => keys.includes(f.key)).map(f =>
      apiClient.post('/vitals', {
        patientId,
        appointmentId,
        code: f.code,
        display: f.display,
        valueQuantity: vitals[f.key],
        valueUnit: f.ucum,
        effectiveDateTime,
      }),
    ),
  );
}
