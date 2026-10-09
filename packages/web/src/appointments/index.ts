/**
 * What an appointment is for. The codes are what the API stores and accepts
 * (`VisitType` in the appointment service); keep the two lists in step.
 */
export const VISIT_TYPES = [
  { code: "consultation", label: "Consultation" },
  { code: "follow_up", label: "Follow-up" },
  { code: "procedure", label: "Procedure" },
  { code: "emergency", label: "Emergency" },
] as const;

export type VisitType = (typeof VISIT_TYPES)[number]["code"];

export const VISIT_TYPE_CODES = VISIT_TYPES.map(t => t.code) as [VisitType, ...VisitType[]];

/** A visit type as people read it. A code this list doesn't know shows as stored; none shows as "Not set". */
export function visitTypeLabel(code: string | null | undefined): string {
  if (!code) return "Not set";
  return VISIT_TYPES.find(t => t.code === code)?.label ?? code;
}
