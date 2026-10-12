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
  Observation: "vital signs",
  Condition: "a condition",
  AllergyIntolerance: "an allergy",
  MedicationRequest: "a prescription",
  MedicationDispense: "a dispense",
  DiagnosticReport: "a lab report",
  DocumentReference: "a document",
};

/** What an entry records, in words: "Changed a user account". */
export function describeAuditEntry({ action, resourceType }: AuditEntry): string {
  const verb = VERBS[action] ?? action.charAt(0) + action.slice(1).toLowerCase();
  return `${verb} ${RECORDS[resourceType] ?? resourceType}`;
}

/** The accounts an entry mentions: who acted and, for a user account, whose. */
export const auditUserIds = (entry: AuditEntry) =>
  entry.resourceType === "User" ? [entry.userId, entry.resourceId] : [entry.userId];
