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

function mapFhirDocument(d: Record<string, any>): DocumentRef {
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

export async function getDocumentsByPatient(patientId: string, encounterId?: string): Promise<DocumentRef[]> {
  const res = await apiClient.get('/documents', {
    params: { patientId, ...(encounterId ? { encounterId } : {}) },
  });
  return (res.data as Record<string, any>[]).map(mapFhirDocument);
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

  const res = await apiClient.post('/documents', form, {
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
