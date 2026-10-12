export { cn } from "@curo/web/ui/utils";
export { formatDate, formatDateTime, getPatientName } from "@curo/web/format";

export function formatAllergies(allergies: { substance: string; severity: string }[]): string {
  return allergies.map(a => `${a.substance} (${a.severity})`).join(', ');
}
