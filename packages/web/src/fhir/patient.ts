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
  valueDateTime?: string;
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
  return ext?.valueString ?? ext?.valueCode ?? ext?.valueDate ?? ext?.valueDateTime ?? "";
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

/**
 * A patient as the API returns it. Pharmacy and lab staff get a minimized one:
 * identity only, with no contact, address, NIC or details.
 */
export interface FhirPatient extends FhirPatientDetails {
  resourceType: "Patient";
  id: string;
  meta?: { lastUpdated?: string };
  identifier?: Array<{ system: string; value: string }>;
  active?: boolean;
  name?: Array<{ family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
  contact?: Array<{
    name?: { text?: string };
    telecom?: Array<{ system: string; value: string }>;
    relationship?: Array<{ text?: string }>;
  }>;
}

/** A person's name as the portals show it; `full` includes any middle name. */
export interface PersonName {
  first: string;
  last: string;
  full: string;
}

/** A patient as the staff portals show them. Anything the API left out is blank. */
export interface Patient {
  id: string;
  /** The clinic's patient code. */
  mrn: string;
  phn: string;
  nic: string;
  name: PersonName;
  dob: string;
  sex: "male" | "female" | "other";
  bloodType: string;
  nationality: string;
  occupation: string;
  maritalStatus?: MaritalStatus;
  phone: string;
  email: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    district: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: { name: string; relationship: string; phone: string };
  insurance: Insurance | null;
  tags: string[];
  /** When the clinic registered them; empty in the minimized view pharmacy and lab get. */
  registeredAt: string;
  /** The last change to the record. */
  updatedAt: string;
}

const identifierOf = (fhir: FhirPatient, system: string) =>
  fhir.identifier?.find((i) => i.system === system)?.value ?? "";

const telecomOf = (fhir: FhirPatient, system: string) =>
  fhir.telecom?.find((t) => t.system === system)?.value ?? "";

export function mapFhirPatient(fhir: FhirPatient): Patient {
  const [first = "", middle = ""] = fhir.name?.[0]?.given ?? [];
  const last = fhir.name?.[0]?.family ?? "";
  const address = fhir.address?.[0];
  const contact = fhir.contact?.[0];

  return {
    id: fhir.id,
    mrn: identifierOf(fhir, "urn:curo:patient-code"),
    phn: identifierOf(fhir, "urn:curo:phn"),
    nic: identifierOf(fhir, "urn:curo:nic"),
    name: { first, last, full: [first, middle, last].filter(Boolean).join(" ") },
    dob: fhir.birthDate ?? "",
    sex: (fhir.gender as Patient["sex"]) ?? "other",
    ...mapFhirPatientDetails(fhir),
    phone: telecomOf(fhir, "phone"),
    email: telecomOf(fhir, "email"),
    address: {
      line1: address?.line?.[0] ?? "",
      line2: address?.line?.[1] ?? "",
      city: address?.city ?? "",
      district: address?.state ?? "",
      postalCode: address?.postalCode ?? "",
      country: address?.country ?? "",
    },
    emergencyContact: {
      name: contact?.name?.text ?? "",
      relationship: contact?.relationship?.[0]?.text ?? "",
      phone: contact?.telecom?.[0]?.value ?? "",
    },
    registeredAt: valueOf(fhir.extension, "urn:curo:registeredAt"),
    updatedAt: fhir.meta?.lastUpdated ?? "",
  };
}
