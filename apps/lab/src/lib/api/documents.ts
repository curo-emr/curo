import { apiClient } from './client';

export interface DocumentRef {
  id: string;
  type: string;
  description?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  date?: string;
  encounterId?: string;
  relatedResourceId?: string;
  relatedResourceType?: string;
}

export interface UploadDocumentInput {
  file: File;
  patientId: string;
  type: string;
  description?: string;
  encounterId?: string;
  relatedResourceId?: string;
  relatedResourceType?: string;
}

// The fields of the document service's FHIR DocumentReference that the UI reads.
interface FhirDocumentReference {
  id: string;
  type: string;
  description?: string;
  date?: string;
  context?: {
    encounter?: { reference: string }[];
    related?: { reference: string }[];
  };
  content?: { attachment?: { title?: string; contentType?: string; size?: number } }[];
}

function mapFhirDocument(d: FhirDocumentReference): DocumentRef {
  const attachment = d.content?.[0]?.attachment ?? {};
  const encounterRef: string | undefined = d.context?.encounter?.[0]?.reference;
  const relatedRef: string | undefined = d.context?.related?.[0]?.reference;
  return {
    id: d.id,
    type: d.type,
    description: d.description,
    fileName: attachment.title,
    contentType: attachment.contentType,
    size: attachment.size,
    date: d.date,
    encounterId: encounterRef ? encounterRef.split('/')[1] : undefined,
    relatedResourceType: relatedRef ? relatedRef.split('/')[0] : undefined,
    relatedResourceId: relatedRef ? relatedRef.split('/')[1] : undefined,
  };
}

/** The report files uploaded for a lab order. */
export async function getOrderReports(serviceRequestId: string): Promise<DocumentRef[]> {
  const res = await apiClient.get<FhirDocumentReference[]>('/documents', {
    params: { serviceRequestId },
  });
  return res.data.map(mapFhirDocument);
}

export async function uploadDocument(input: UploadDocumentInput): Promise<DocumentRef> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('patientId', input.patientId);
  form.append('type', input.type);
  if (input.description) form.append('description', input.description);
  if (input.encounterId) form.append('encounterId', input.encounterId);
  if (input.relatedResourceId) form.append('relatedResourceId', input.relatedResourceId);
  if (input.relatedResourceType) form.append('relatedResourceType', input.relatedResourceType);

  const res = await apiClient.post<FhirDocumentReference>('/documents', form, {
    // Let the browser set multipart/form-data with its boundary; the shared
    // client defaults to application/json which would break the upload.
    headers: { 'Content-Type': undefined as unknown as string },
  });
  return mapFhirDocument(res.data);
}

/** Fetch document bytes via the authenticated client and open them. */
export async function openDocument(id: string): Promise<void> {
  const res = await apiClient.get(`/documents/${id}/content`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
