import { apiClient } from './client';
import type { Prescription, LabOrder, Vitals, SOAP } from '@/types';
import {
  mapFhirMedicationRequest, mapFhirServiceRequest,
  type FhirMedicationRequest, type FhirServiceRequest,
} from './mappers';
import { unwrapBundle, type FhirBundle } from './fhir';

// Shared LOINC ⇄ Vitals-field map, used both to write vitals (one observation per
// field) and to read them back. Keyed by LOINC code; display/unit are for the write path.
export const VITALS_MAP = [
  { key: 'bpSystolic' as keyof Vitals, code: '8480-6', display: 'Blood Pressure Systolic', unit: 'mmHg' },
  { key: 'bpDiastolic' as keyof Vitals, code: '8462-4', display: 'Blood Pressure Diastolic', unit: 'mmHg' },
  { key: 'pulseBpm' as keyof Vitals, code: '8867-4', display: 'Heart rate', unit: 'bpm' },
  { key: 'temperatureC' as keyof Vitals, code: '8310-5', display: 'Body temperature', unit: 'Cel' },
  { key: 'spo2Percent' as keyof Vitals, code: '2708-6', display: 'Oxygen saturation', unit: '%' },
  { key: 'respirationRpm' as keyof Vitals, code: '9279-1', display: 'Respiratory rate', unit: '/min' },
  { key: 'heightCm' as keyof Vitals, code: '8302-2', display: 'Body height', unit: 'cm' },
  { key: 'weightKg' as keyof Vitals, code: '29463-7', display: 'Body weight', unit: 'kg' },
];

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getNotesByEncounter(encounterId: string) {
  const res = await apiClient.get('/notes', { params: { encounterId } });
  return res.data;
}

// Latest SOAP note for an encounter, mapped to the SOAP shape (or null if none).
// `/notes` returns raw clinical_notes rows with no ordering, so we sort by createdAt.
export async function getEncounterSoap(encounterId: string): Promise<SOAP | null> {
  const notes = await getNotesByEncounter(encounterId);
  if (!Array.isArray(notes) || notes.length === 0) return null;
  const latest = [...notes].sort(
    (a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime(),
  )[0];
  return {
    subjective: latest?.subjective ?? '',
    objective: latest?.objective ?? '',
    assessment: latest?.assessment ?? '',
    plan: latest?.plan ?? '',
  };
}

export async function createNote(data: Record<string, unknown>) {
  const res = await apiClient.post('/notes', data);
  return res.data;
}

// ─── Vitals ──────────────────────────────────────────────────────────────────

export async function getVitalsByPatient(patientId: string) {
  const res = await apiClient.get('/vitals', { params: { patientId } });
  return res.data;
}

interface FhirObservation {
  encounter?: { reference?: string };
  code?: { coding?: Array<{ code?: string; display?: string }> };
  valueQuantity?: { value?: number; unit?: string };
  effectiveDateTime?: string;
  performer?: Array<{ reference?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
}

const VITAL_KEY_BY_CODE = new Map(VITALS_MAP.map(v => [v.code, v.key]));
const observedAt = (o: FhirObservation) => new Date(o.effectiveDateTime ?? 0).getTime();
const isNurseRecorded = (o: FhirObservation) =>
  o.extension?.some(e => e.url === 'urn:curo:performerRole' && e.valueString === 'NURSE') ?? false;

// Collapse observations into one Vitals object, keyed strictly by LOINC code (DB
// displays/units vary, e.g. bpm vs /min). When a field was measured more than once
// (nurse at triage, then the doctor), the most recent value wins.
function collapseVitals(observations: FhirObservation[]): Partial<Vitals> {
  const vitals: Partial<Vitals> = {};
  for (const o of [...observations].sort((a, b) => observedAt(a) - observedAt(b))) {
    const key = VITAL_KEY_BY_CODE.get(o?.code?.coding?.[0]?.code ?? '');
    const value = o?.valueQuantity?.value;
    if (key && typeof value === 'number') vitals[key] = value;
  }
  return vitals;
}

export interface EncounterVitals {
  vitals: Partial<Vitals>;
  triagedByNurse: boolean;
}

// Vitals recorded against a specific encounter (including nurse triage vitals,
// which the backend links to the encounter when it is created).
export async function getEncounterVitals(patientId: string, encounterId: string): Promise<EncounterVitals> {
  const observations = ((await getVitalsByPatient(patientId)) as FhirObservation[] ?? [])
    .filter(o => o?.encounter?.reference === `Encounter/${encounterId}`);
  return { vitals: collapseVitals(observations), triagedByNurse: observations.some(isNurseRecorded) };
}

// The most recent value of every vital the patient has on record, and when the last one was taken.
export async function getLatestVitals(patientId: string): Promise<{ vitals: Partial<Vitals>; recordedAt: string | null }> {
  const observations = ((await getVitalsByPatient(patientId)) as FhirObservation[]) ?? [];
  const latest = observations.reduce<FhirObservation | null>((a, b) => (!a || observedAt(b) > observedAt(a) ? b : a), null);
  return { vitals: collapseVitals(observations), recordedAt: latest?.effectiveDateTime ?? null };
}

export interface TriageVitals {
  vitals: Partial<Vitals>;
  recordedById: string | null;
  recordedAt: string | null;
}

// Vitals the nurse recorded for an appointment at triage (null when none).
export async function getVitalsByAppointment(appointmentId: string): Promise<TriageVitals | null> {
  const res = await apiClient.get<FhirObservation[]>('/vitals', { params: { appointmentId } });
  const observations = res.data ?? [];
  if (observations.length === 0) return null;
  const latest = observations.reduce((a, b) => (observedAt(b) > observedAt(a) ? b : a));
  return {
    vitals: collapseVitals(observations),
    recordedById: latest.performer?.[0]?.reference?.replace('Practitioner/', '') ?? null,
    recordedAt: latest.effectiveDateTime ?? null,
  };
}

export async function getVitalsTrend(patientId: string) {
  const res = await apiClient.get(`/vitals/patient/${patientId}/trend`);
  return res.data;
}

export interface TrendPoint {
  code: string;
  display: string;
  value: number;
  unit: string;
  effectiveDateTime: string;
}

// Multi-code, category-agnostic trend (BP + glucose + cholesterol, etc.)
export async function getObservationTrends(patientId: string, codes: string[]): Promise<TrendPoint[]> {
  const res = await apiClient.get<FhirObservation[]>(`/vitals/patient/${patientId}/trends`, {
    params: { codes: codes.join(",") },
  });
  return (res.data ?? []).flatMap((o): TrendPoint[] => {
    const value = o.valueQuantity?.value;
    if (value == null || !o.effectiveDateTime) return [];
    const coding = o.code?.coding?.[0];
    return [{
      code: coding?.code ?? "",
      display: coding?.display ?? "",
      value,
      unit: o.valueQuantity?.unit ?? "",
      effectiveDateTime: o.effectiveDateTime,
    }];
  });
}

export async function createVitals(data: Record<string, unknown>) {
  const res = await apiClient.post('/vitals', data);
  return res.data;
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
}

export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[] | FhirBundle<FhirMedicationRequest>>('/prescriptions/pending');
  return unwrapBundle(res.data).resources.map(mapFhirMedicationRequest);
}

export async function createPrescription(data: Record<string, unknown>): Promise<Prescription> {
  const res = await apiClient.post<FhirMedicationRequest>('/prescriptions', data);
  return mapFhirMedicationRequest(res.data);
}

// ─── Lab Orders ──────────────────────────────────────────────────────────────

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[] | FhirBundle<FhirServiceRequest>>('/lab-orders', { params: { patientId } });
  return unwrapBundle(res.data).resources.map(mapFhirServiceRequest);
}

// Lab orders this doctor placed whose results came back in the last `days` days, newest first.
// (`/lab-orders` has no status/requester filter, so both are applied here.)
export async function getRecentLabResults(practitionerId: string, days = 7): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[] | FhirBundle<FhirServiceRequest>>('/lab-orders');
  const since = Date.now() - days * 86_400_000;
  return unwrapBundle(res.data).resources
    .map(mapFhirServiceRequest)
    .filter(o => o.doctorId === practitionerId && o.status === 'completed' && new Date(o.createdAt).getTime() >= since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLabOrder(data: Record<string, unknown>): Promise<LabOrder> {
  const res = await apiClient.post<FhirServiceRequest>('/lab-orders', data);
  return mapFhirServiceRequest(res.data);
}
