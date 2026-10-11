// A lab's report on one order, as the lab service sends it (a DiagnosticReport
// with Curo's flat result rows), read the same way by every portal.

/** The fields of the lab service's DiagnosticReport that the portals read. */
export interface FhirDiagnosticReport {
  id: string;
  basedOn?: Array<{ reference?: string }>;
  issued?: string | null;
  conclusion?: string | null;
  result?: Array<{
    code: string;
    display: string;
    value?: number | null;
    valueString?: string | null;
    unit?: string | null;
    referenceRangeLow?: string | null;
    referenceRangeHigh?: string | null;
    referenceRangeText?: string | null;
    interpretation?: string | null;
  }>;
  presentedForm?: Array<{ contentType?: string; data?: string }>;
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

/** What a lab reported for an order: typed values and/or a generated PDF. */
export interface LabReport {
  id: string;
  orderId: string;
  issued: string | null;
  conclusion?: string;
  results: LabResultValue[];
  /** The PDF made from the typed values, as base64; absent when only a file was uploaded. */
  pdfBase64?: string;
}

type FhirResult = NonNullable<FhirDiagnosticReport["result"]>[number];

function referenceRange(r: FhirResult): string | undefined {
  if (r.referenceRangeText) return r.referenceRangeText;
  if (r.referenceRangeLow && r.referenceRangeHigh) return `${r.referenceRangeLow}–${r.referenceRangeHigh}`;
  return undefined;
}

export function mapFhirReport(r: FhirDiagnosticReport): LabReport {
  return {
    id: r.id,
    orderId: r.basedOn?.[0]?.reference?.replace("ServiceRequest/", "") ?? "",
    issued: r.issued ?? null,
    conclusion: r.conclusion ?? undefined,
    results: (r.result ?? []).map((x): LabResultValue => ({
      code: x.code,
      display: x.display,
      value: x.value != null ? String(x.value) : (x.valueString ?? ""),
      unit: x.unit ?? undefined,
      referenceRange: referenceRange(x),
      interpretation: x.interpretation ?? undefined,
    })),
    pdfBase64: r.presentedForm?.find(f => f.contentType === "application/pdf")?.data,
  };
}
