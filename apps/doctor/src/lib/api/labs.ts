import { apiClient, getAllPages } from '@curo/web/api';
import { mapFhirReport, type FhirDiagnosticReport, type LabReport } from '@curo/web/fhir';
import type { Lab } from '@/types';

interface ApiOrganization {
  id: string;
  name: string;
  city?: string | null;
}

/** The laboratories tests can be sent to; with `includeInactive`, closed ones too (to name past orders' labs). */
export async function getLabs(options: { includeInactive?: boolean } = {}): Promise<Lab[]> {
  const res = await apiClient.get<ApiOrganization[]>('/organizations', {
    params: { type: 'laboratory', ...(options.includeInactive && { includeInactive: true }) },
  });
  return res.data.map(o => ({ id: o.id, name: o.name, city: o.city ?? null }));
}

/** The patient's lab reports, from every lab. */
export async function getPatientLabReports(patientId: string): Promise<LabReport[]> {
  return (await getAllPages<FhirDiagnosticReport>('/reports', { patientId })).map(mapFhirReport);
}

/** The QR for the patient's lab slip: any lab scanning it finds the visit's tests sent to it. */
export async function getLabSlipQr(encounterId: string): Promise<string> {
  const res = await apiClient.get<{ qrBase64: string }>(`/encounters/${encounterId}/lab-slip`);
  return res.data.qrBase64;
}
