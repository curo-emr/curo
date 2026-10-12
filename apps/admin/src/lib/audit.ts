import type { AuditEntry } from "@/types";

const VERBS: Record<string, string> = {
  CREATE: "Created",
  READ: "Opened",
  UPDATE: "Changed",
  DELETE: "Deleted",
};

// The records the services audit, in the words the portals use for them.
const RECORDS: Record<string, string> = {
  User: "a user account",
  Schedule: "a doctor's weekly sessions",
  Organization: "an organization",
  Payment: "a payment",
  Patient: "a patient record",
  Appointment: "an appointment",
  Encounter: "a visit",
  ClinicalNote: "a visit note",
  Task: "a task",
  Observation: "vital signs",
  Condition: "a condition",
  AllergyIntolerance: "an allergy",
  MedicationRequest: "a prescription",
  MedicationDispense: "a dispense",
  ServiceRequest: "a lab order",
  DiagnosticReport: "a lab report",
  DocumentReference: "a document",
};

/** What an entry records, in words: "Changed a user account". */
export function describeAuditEntry({ action, resourceType }: AuditEntry): string {
  const verb = VERBS[action] ?? action.charAt(0) + action.slice(1).toLowerCase();
  return `${verb} ${RECORDS[resourceType] ?? resourceType}`;
}

/** The account an entry is about, if any: a user account, or the doctor whose weekly sessions changed. */
export function auditSubject({ resourceType, resourceId }: AuditEntry): { by: "id" | "practitionerId"; id: string } | null {
  if (resourceType === "User") return { by: "id", id: resourceId };
  if (resourceType === "Schedule") return { by: "practitionerId", id: resourceId };
  return null;
}

/** The accounts a page of entries mentions, by user and by practitioner id, to look up in one request. */
export function auditAccounts(entries: AuditEntry[]): { ids: string[]; practitionerIds: string[] } {
  const ids = new Set(entries.map(e => e.userId));
  const practitionerIds = new Set<string>();
  for (const entry of entries) {
    const subject = auditSubject(entry);
    if (subject) (subject.by === "id" ? ids : practitionerIds).add(subject.id);
  }
  return { ids: [...ids].sort(), practitionerIds: [...practitionerIds].sort() };
}
