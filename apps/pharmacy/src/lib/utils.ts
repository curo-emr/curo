import { formatAllergySeverity, type Allergy } from "@curo/web/fhir";

export { cn } from "@curo/web/ui/utils";
export { formatDate, formatDateTime, getPatientName } from "@curo/web/format";

export function formatAllergies(allergies: Pick<Allergy, 'substance' | 'severity'>[]): string {
  return allergies.map(a => `${a.substance} (${formatAllergySeverity(a.severity)})`).join(', ');
}
