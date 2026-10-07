import { apiClient } from '@curo/web/api';
import type { Vitals } from '@/types';
import { VITAL_FIELDS } from '@/lib/vitals';

interface FhirObservation {
  code?: { coding?: Array<{ code?: string }> };
  valueQuantity?: { value?: number };
  effectiveDateTime?: string;
}

const KEY_BY_CODE = new Map(VITAL_FIELDS.map(f => [f.code, f.key]));
const observedAt = (o: FhirObservation) => new Date(o.effectiveDateTime ?? 0).getTime();

// Collapse observations into one Vitals object; the most recent value per LOINC code wins.
function collapseVitals(observations: FhirObservation[]): Partial<Vitals> {
  const vitals: Partial<Vitals> = {};
  for (const o of [...observations].sort((a, b) => observedAt(a) - observedAt(b))) {
    const key = KEY_BY_CODE.get(o.code?.coding?.[0]?.code ?? '');
    const value = o.valueQuantity?.value;
    if (key && typeof value === 'number') vitals[key] = value;
  }
  return vitals;
}

// Vitals already recorded for this visit (when a nurse re-opens triage).
export async function getVisitVitals(appointmentId: string): Promise<Partial<Vitals>> {
  const res = await apiClient.get<FhirObservation[]>('/vitals', { params: { appointmentId } });
  return collapseVitals(res.data ?? []);
}

// The patient's most recent value for each vital — shown as a reference while triaging.
export async function getLatestVitals(patientId: string): Promise<Partial<Vitals>> {
  const res = await apiClient.get<FhirObservation[]>(`/vitals/patient/${patientId}`);
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
