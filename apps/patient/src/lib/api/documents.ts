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
  return {
    id: d.id,
    type: d.type,
    description: d.description,
    fileName: attachment.title,
    contentType: attachment.contentType,
    size: attachment.size,
    date: d.date,
    encounterId: encounterRef ? encounterRef.split('/')[1] : undefined,
  };
}

/** The patient's own documents; identity is resolved from the JWT server-side. */
export async function getMyDocuments(): Promise<DocumentRef[]> {
  const res = await apiClient.get<FhirDocumentReference[]>('/documents/me');
  return res.data.map(mapFhirDocument);
}

/** Fetch document bytes via the authenticated client and open them. */
export async function openDocument(id: string): Promise<void> {
  const res = await apiClient.get(`/documents/${id}/content`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
