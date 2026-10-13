// A lab's report on one order, as the lab service sends it (a DiagnosticReport
// with Curo's flat result rows), read the same way by every portal.

import { formatRange } from "../clinical/lab-results";

/** One value in a report, as the lab service sends it. */
export interface FhirLabResult {
  code: string;
  display: string;
  value?: number | null;
  valueString?: string | null;
  unit?: string | null;
  referenceRangeLow?: string | null;
  referenceRangeHigh?: string | null;
  referenceRangeText?: string | null;
  interpretation?: string | null;
}

/** The fields of the lab service's DiagnosticReport that the portals read. */
export interface FhirDiagnosticReport {
  id: string;
  basedOn?: Array<{ reference?: string }>;
  issued?: string | null;
  conclusion?: string | null;
  result?: FhirLabResult[];
  presentedForm?: FhirAttachment[];
}

/** A file carried inline in a resource, its bytes as base64. */
export interface FhirAttachment {
  contentType?: string;
  data?: string;
}

export interface LabResultValue {
  code: string;
  display: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  /** The FHIR interpretation code the lab gave it (H, L, HH, LL, A, N); read it with `resultFlag`. */
  interpretation?: string;
}

/** What a lab reported for an order: typed values, results pasted as text, and a generated PDF. */
export interface LabReport {
  id: string;
  orderId: string;
  issued: string | null;
  conclusion?: string;
  results: LabResultValue[];
  /** The results as the lab pasted them (a printout), to show as is. */
  resultsText?: string;
  /** The PDF made from the typed values or text, as base64; absent when only a file was uploaded. */
  pdfBase64?: string;
}

/** One value in a report, as the portals show it. */
export function mapLabResult(x: FhirLabResult): LabResultValue {
  return {
    code: x.code,
    display: x.display,
    value: x.value != null ? String(x.value) : (x.valueString ?? ""),
    unit: x.unit ?? undefined,
    referenceRange: x.referenceRangeText || formatRange(x.referenceRangeLow, x.referenceRangeHigh) || undefined,
    interpretation: x.interpretation ?? undefined,
  };
}

export function mapFhirReport(r: FhirDiagnosticReport): LabReport {
  return {
    id: r.id,
    orderId: r.basedOn?.[0]?.reference?.replace("ServiceRequest/", "") ?? "",
    issued: r.issued ?? null,
    conclusion: r.conclusion ?? undefined,
    results: (r.result ?? []).map(mapLabResult),
    resultsText: presentedText(r.presentedForm),
    pdfBase64: presented(r.presentedForm, "application/pdf"),
  };
}

/** The base64 data of the first attachment of `contentType` (parameters such as a charset aside). */
function presented(forms: FhirAttachment[] | undefined, contentType: string): string | undefined {
  return forms?.find(f => f.contentType?.split(";")[0].trim() === contentType)?.data;
}

/** The results a lab pasted as text: the report's plain-text attachment, read as UTF-8. */
export function presentedText(forms: FhirAttachment[] | undefined): string | undefined {
  const data = presented(forms, "text/plain");
  if (data === undefined) return undefined;
  return new TextDecoder().decode(Uint8Array.from(atob(data), c => c.charCodeAt(0)));
}
