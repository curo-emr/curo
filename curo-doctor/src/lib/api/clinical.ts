import { apiClient } from './client';
import type { Prescription, LabOrder, Vitals, SOAP } from '@/types';
import {
  mapFhirMedicationRequest, mapFhirServiceRequest,
  type FhirMedicationRequest, type FhirServiceRequest,
} from './mappers';

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

// Vitals recorded against a specific encounter, collapsed into a single Vitals object.
// `/vitals` only filters by patient, so we filter on the observation's encounter reference
// and key strictly by LOINC code (DB displays/units vary, e.g. bpm vs /min).
interface FhirObservation {
  encounter?: { reference?: string };
  code?: { coding?: Array<{ code?: string }> };
  valueQuantity?: { value?: number };
}

export async function getEncounterVitals(patientId: string, encounterId: string): Promise<Partial<Vitals>> {
  const observations = (await getVitalsByPatient(patientId)) as FhirObservation[];
  const codeToKey = new Map(VITALS_MAP.map(v => [v.code, v.key]));
  const vitals: Partial<Vitals> = {};
  for (const o of observations ?? []) {
    if (o?.encounter?.reference !== `Encounter/${encounterId}`) continue;
    const key = codeToKey.get(o?.code?.coding?.[0]?.code ?? '');
    const value = o?.valueQuantity?.value;
    if (key && typeof value === 'number') vitals[key] = value;
  }
  return vitals;
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
  const res = await apiClient.get<any[]>(`/vitals/patient/${patientId}/trends`, {
    params: { codes: codes.join(",") },
  });
  return (res.data ?? [])
    .map((o) => ({
      code: o?.code?.coding?.[0]?.code ?? "",
      display: o?.code?.coding?.[0]?.display ?? "",
      value: o?.valueQuantity?.value ?? null,
      unit: o?.valueQuantity?.unit ?? "",
      effectiveDateTime: o?.effectiveDateTime ?? "",
    }))
    .filter((p) => p.value != null && p.effectiveDateTime);
}

export async function createVitals(data: Record<string, unknown>) {
  const res = await apiClient.post('/vitals', data);
  return res.data;
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions', { params: { patientId } });
  return res.data.map(mapFhirMedicationRequest);
}

export async function getPendingPrescriptions(): Promise<Prescription[]> {
  const res = await apiClient.get<FhirMedicationRequest[]>('/prescriptions/pending');
  return res.data.map(mapFhirMedicationRequest);
}

export async function createPrescription(data: Record<string, unknown>): Promise<Prescription> {
  const res = await apiClient.post<FhirMedicationRequest>('/prescriptions', data);
  return mapFhirMedicationRequest(res.data);
}

// ─── Lab Orders ──────────────────────────────────────────────────────────────

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab-orders', { params: { patientId } });
  return res.data.map(mapFhirServiceRequest);
}

export async function getPendingLabOrders(): Promise<LabOrder[]> {
  const res = await apiClient.get<FhirServiceRequest[]>('/lab-orders', { params: { status: 'results_pending' } });
  return res.data.map(mapFhirServiceRequest);
}

export async function createLabOrder(data: Record<string, unknown>): Promise<LabOrder> {
  const res = await apiClient.post<FhirServiceRequest>('/lab-orders', data);
  return mapFhirServiceRequest(res.data);
}
