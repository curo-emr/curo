export const ALLERGY_SEVERITIES = ["mild", "moderate", "severe"] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  notes: string;
  recordedAt: string;
}

export interface FhirAllergy {
  resourceType: "AllergyIntolerance";
  id: string;
  meta?: { lastUpdated?: string };
  patient?: { reference?: string };
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  reaction?: Array<{ manifestation?: Array<{ text?: string }>; severity?: string }>;
  criticality?: string;
  note?: Array<{ text?: string }>;
  recordedDate?: string;
}

/** For allergies recorded without a reaction severity, such as the seeded ones. */
const SEVERITY_FROM_CRITICALITY: Record<string, AllergySeverity> = {
  low: "mild",
  high: "severe",
  "unable-to-assess": "mild",
};

const isSeverity = (value?: string): value is AllergySeverity =>
  ALLERGY_SEVERITIES.includes(value as AllergySeverity);

function severityOf(fhir: FhirAllergy): AllergySeverity {
  const reported = fhir.reaction?.[0]?.severity;
  if (isSeverity(reported)) return reported;
  return SEVERITY_FROM_CRITICALITY[fhir.criticality ?? ""] ?? "mild";
}

export function mapFhirAllergy(fhir: FhirAllergy): Allergy {
  return {
    id: fhir.id,
    patientId: fhir.patient?.reference?.split("/")[1] ?? "",
    substance: fhir.code?.text ?? fhir.code?.coding?.[0]?.display ?? "",
    reaction: fhir.reaction?.[0]?.manifestation?.[0]?.text ?? "",
    severity: severityOf(fhir),
    notes: fhir.note?.[0]?.text ?? "",
    recordedAt: fhir.recordedDate ?? fhir.meta?.lastUpdated ?? "",
  };
}
