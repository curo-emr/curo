import { apiClient } from './client';
import { unwrapBundle, type FhirBundle } from './fhir';
import type { Lab, LabReport, LabResultValue } from '@/types';

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

// The fields of the lab service's DiagnosticReport that the UI reads.
interface FhirDiagnosticReport {
  id: string;
  basedOn?: Array<{ reference?: string }>;
  issued?: string | null;
  conclusion?: string | null;
  result?: Array<{
    code: string;
    display: string;
    value?: number | null;
    valueString?: string | null;
    unit?: string | null;
    referenceRangeLow?: string | null;
    referenceRangeHigh?: string | null;
    referenceRangeText?: string | null;
    interpretation?: string | null;
  }>;
  presentedForm?: Array<{ contentType?: string; data?: string }>;
}

function referenceRange(r: NonNullable<FhirDiagnosticReport['result']>[number]): string | undefined {
  if (r.referenceRangeText) return r.referenceRangeText;
  if (r.referenceRangeLow && r.referenceRangeHigh) return `${r.referenceRangeLow}–${r.referenceRangeHigh}`;
  return undefined;
}

function mapReport(r: FhirDiagnosticReport): LabReport {
  return {
    id: r.id,
    orderId: r.basedOn?.[0]?.reference?.replace('ServiceRequest/', '') ?? '',
    issued: r.issued ?? null,
    conclusion: r.conclusion ?? undefined,
    results: (r.result ?? []).map((x): LabResultValue => ({
      code: x.code,
      display: x.display,
      value: x.value != null ? String(x.value) : (x.valueString ?? ''),
      unit: x.unit ?? undefined,
      referenceRange: referenceRange(x),
      interpretation: x.interpretation ?? undefined,
    })),
    pdfBase64: r.presentedForm?.find(f => f.contentType === 'application/pdf')?.data,
  };
}

/** The lab reports for a visit's orders, from every lab. */
export async function getVisitLabReports(encounterId: string): Promise<LabReport[]> {
  const res = await apiClient.get<FhirBundle<FhirDiagnosticReport>>('/reports', {
    params: { encounterId, pageSize: 100 },
  });
  return unwrapBundle(res.data).resources.map(mapReport);
}

/** The QR for the patient's lab slip: any lab scanning it finds the visit's tests sent to it. */
export async function getLabSlipQr(encounterId: string): Promise<string> {
  const res = await apiClient.get<{ qrBase64: string }>(`/encounters/${encounterId}/lab-slip`);
  return res.data.qrBase64;
}

/** Opens a base64 PDF (a lab report made from typed values) in a new tab. */
export function openPdf(base64: string): void {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
