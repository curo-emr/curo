export const MARITAL_STATUSES = ["single", "married", "divorced", "widowed", "other"] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const INSURANCE_RELATIONSHIPS = ["self", "spouse", "child", "other"] as const;
export type InsuranceRelationship = (typeof INSURANCE_RELATIONSHIPS)[number];

export interface Insurance {
  provider: string;
  policyNumber: string;
  groupNumber: string;
  expiryDate: string;
  holderName: string;
  relationship: InsuranceRelationship;
}

export interface FhirExtension {
  url: string;
  valueString?: string;
  valueCode?: string;
  valueDate?: string;
  extension?: FhirExtension[];
}

/**
 * The API stores marital status as a FHIR v3-MaritalStatus code. The forms only
 * offer these five, so "other" stands for every code without its own option.
 */
const MARITAL_STATUS_CODES: Record<MaritalStatus, string> = {
  single: "S",
  married: "M",
  divorced: "D",
  widowed: "W",
  other: "UNK",
};

export const maritalStatusCode = (status: MaritalStatus) => MARITAL_STATUS_CODES[status];

function maritalStatusFromCode(code?: string): MaritalStatus | undefined {
  if (!code) return undefined;
  const match = MARITAL_STATUSES.find((status) => MARITAL_STATUS_CODES[status] === code);
  return match ?? "other";
}

const valueOf = (extensions: FhirExtension[] | undefined, url: string) => {
  const ext = extensions?.find((e) => e.url === url);
  return ext?.valueString ?? ext?.valueCode ?? ext?.valueDate ?? "";
};

const isInsuranceRelationship = (value: string): value is InsuranceRelationship =>
  INSURANCE_RELATIONSHIPS.includes(value as InsuranceRelationship);

function insuranceOf(extensions: FhirExtension[]): Insurance | null {
  const parts = extensions.find((e) => e.url === "urn:curo:insurance")?.extension;
  if (!parts) return null;
  const relationship = valueOf(parts, "relationship");
  return {
    provider: valueOf(parts, "provider"),
    policyNumber: valueOf(parts, "policyNumber"),
    groupNumber: valueOf(parts, "groupNumber"),
    expiryDate: valueOf(parts, "expiryDate"),
    holderName: valueOf(parts, "holderName"),
    relationship: isInsuranceRelationship(relationship) ? relationship : "self",
  };
}

/** The parts of a FHIR Patient that the patient service sends as extensions and codings. */
export interface FhirPatientDetails {
  maritalStatus?: { coding?: Array<{ code?: string }> };
  extension?: FhirExtension[];
}

/** A patient's details beyond name, identifiers, contact and address, as the portals show them. */
export function mapFhirPatientDetails(fhir: FhirPatientDetails) {
  const extensions = fhir.extension ?? [];
  return {
    bloodType: valueOf(extensions, "urn:curo:bloodType"),
    nationality: valueOf(extensions, "urn:curo:nationality"),
    occupation: valueOf(extensions, "urn:curo:occupation"),
    maritalStatus: maritalStatusFromCode(fhir.maritalStatus?.coding?.[0]?.code),
    tags: extensions.filter((e) => e.url === "urn:curo:tag").map((e) => e.valueString ?? ""),
    insurance: insuranceOf(extensions),
  };
}
