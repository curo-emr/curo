export interface FhirCondition {
  resourceType: "Condition";
  id: string;
  meta?: { lastUpdated?: string };
  subject?: { reference?: string };
  code?: { text?: string; coding?: Array<{ code?: string; display?: string }> };
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  encounter?: { reference?: string };
  category?: Array<{ coding?: Array<{ code?: string }> }>;
  onsetDateTime?: string;
  recordedDate?: string;
  note?: Array<{ text?: string }>;
}

/** A patient's condition as the staff portals show it. */
export interface Problem {
  id: string;
  patientId: string;
  icdCode: string;
  name: string;
  status: "active" | "resolved" | "inactive";
  /** When it started, or when it was recorded if the onset isn't known. */
  onsetDate: string;
  notes: string;
  /** The visit it was diagnosed in, if any. */
  encounterId: string;
  category: string;
  isPrimary: boolean;
}

// The clinical service stores a visit's diagnoses as encounter-diagnosis Conditions;
// the primary one carries this note.
const PRIMARY_DIAGNOSIS_NOTE = "Primary diagnosis";

const PROBLEM_STATUSES: Record<string, Problem["status"]> = {
  active: "active",
  resolved: "resolved",
  inactive: "inactive",
  remission: "resolved",
};

export function mapFhirCondition(fhir: FhirCondition): Problem {
  const coding = fhir.code?.coding?.[0];
  const note = fhir.note?.[0]?.text ?? "";
  return {
    id: fhir.id,
    patientId: fhir.subject?.reference?.split("/")[1] ?? "",
    icdCode: coding?.code ?? "",
    name: fhir.code?.text ?? coding?.display ?? "",
    status: PROBLEM_STATUSES[fhir.clinicalStatus?.coding?.[0]?.code ?? "active"] ?? "active",
    onsetDate: (fhir.onsetDateTime ?? fhir.recordedDate ?? "").slice(0, 10),
    notes: note,
    encounterId: fhir.encounter?.reference?.replace("Encounter/", "") ?? "",
    category: fhir.category?.[0]?.coding?.[0]?.code ?? "",
    isPrimary: note === PRIMARY_DIAGNOSIS_NOTE,
  };
}
