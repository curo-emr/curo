/** Marks a prescription the patient buys at a pharmacy of their choice; it names no pharmacy. */
const BOUGHT_OUTSIDE_URL = "urn:curo:boughtOutside";

/** Whether the patient buys this prescription outside, at a pharmacy of their choice. */
export function isBoughtOutside(fhir: { extension?: { url: string; valueBoolean?: boolean }[] }): boolean {
  return !!fhir.extension?.some((e) => e.url === BOUGHT_OUTSIDE_URL && e.valueBoolean);
}
