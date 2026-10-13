import { formatStatus } from "../format";

/**
 * How bad an allergy's reaction is, or "unknown" when no one has said: a
 * patient often knows what they react to but not how badly, and a guess would
 * mislead whoever reads it. The API takes the other three (FHIR's reaction
 * severities), and null for unknown.
 */
export const ALLERGY_SEVERITIES = ["mild", "moderate", "severe", "unknown"] as const;
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number];
/** A severity as the API takes it: null is unknown. */
export type ReactionSeverity = Exclude<AllergySeverity, "unknown"> | null;

export const reactionSeverity = (severity: AllergySeverity): ReactionSeverity =>
  severity === "unknown" ? null : severity;

/** A severity as the portals show it: "Mild", …, or "Severity unknown". */
export const formatAllergySeverity = (severity: AllergySeverity): string =>
  severity === "unknown" ? "Severity unknown" : formatStatus(severity);

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

const isSeverity = (value?: string): value is AllergySeverity =>
  ALLERGY_SEVERITIES.includes(value as AllergySeverity);

/**
 * The reaction's severity. One recorded without it, such as a seeded one, reads
 * as severe if it's high risk, to be safe, and otherwise as unknown: low risk
 * says little about how bad a reaction was.
 */
function severityOf(fhir: FhirAllergy): AllergySeverity {
  const reported = fhir.reaction?.[0]?.severity;
  if (isSeverity(reported)) return reported;
  return fhir.criticality === "high" ? "severe" : "unknown";
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
