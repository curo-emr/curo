import { apiClient } from '@curo/web/api';

export interface DocumentRef {
  id: string;
  type: string;
  description?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  date?: string;
  encounterId?: string;
  /** The lab order a lab's report file belongs to. */
  orderId?: string;
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
  const idIn = (refs: { reference: string }[] | undefined, type: string) =>
    refs?.find(r => r.reference.startsWith(`${type}/`))?.reference.split('/')[1];
  return {
    id: d.id,
    type: d.type,
    description: d.description,
    fileName: attachment.title,
    contentType: attachment.contentType,
    size: attachment.size,
    date: d.date,
    encounterId: idIn(d.context?.encounter, 'Encounter'),
    orderId: idIn(d.context?.related, 'ServiceRequest'),
  };
}

/** The patient's own documents; identity is resolved from the JWT server-side. */
export async function getMyDocuments(): Promise<DocumentRef[]> {
  const res = await apiClient.get<FhirDocumentReference[]>('/documents/me');
  return res.data.map(mapFhirDocument);
}
