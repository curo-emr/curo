import {
  maritalStatusCode,
  type Allergy,
  type AllergySeverity,
  type InsuranceRelationship,
  type MaritalStatus,
} from "../fhir";

/** One row of a patient form's allergy list. `id` is set for an allergy already on record. */
export interface AllergyEntry {
  id?: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  notes: string;
}

/** What the doctor and reception portals' patient forms produce on submit. */
export interface PatientFormValues {
  nic?: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: "male" | "female" | "other";
  bloodType: string;
  nationality: string;
  maritalStatus: MaritalStatus;
  occupation: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceGroupNumber: string;
  insuranceExpiryDate: string;
  insuranceHolderName: string;
  insuranceRelationship: InsuranceRelationship;
  /** Comma-separated. */
  tags: string;
  allergies: AllergyEntry[];
}

/** An allergy as `POST /patients` and `PATCH /patients/:id` take it. */
export interface NewAllergyBody {
  code: string;
  display: string;
  reaction?: string;
  severity: AllergySeverity;
  note?: string;
}

/** A change to a recorded allergy. `clinicalStatus: "inactive"` retires it. */
export type AllergyUpdateBody = Partial<NewAllergyBody> & {
  id: string;
  clinicalStatus?: "inactive";
};

/**
 * A blank optional field as null: the API keeps any field a PATCH leaves out,
 * so null is what clears it.
 */
const orNull = (value?: string) => value?.trim() || null;

export const parseTags = (text: string) => [
  ...new Set(text.split(",").map((tag) => tag.trim()).filter(Boolean)),
];

/** The patient fields of a create or update body. */
export function patientBody(v: PatientFormValues) {
  // The API only shows insurance details that have a provider, so the rest are
  // dropped without one rather than kept where no one can see them.
  const insured = !!orNull(v.insuranceProvider);
  const insurance = (value: string) => (insured ? orNull(value) : null);

  return {
    firstName: v.firstName,
    lastName: v.lastName,
    nic: orNull(v.nic),
    birthDate: v.dob,
    gender: v.sex,
    phone: v.phone,
    email: orNull(v.email),
    bloodType: orNull(v.bloodType),
    nationality: orNull(v.nationality),
    maritalStatus: maritalStatusCode(v.maritalStatus),
    occupation: orNull(v.occupation),
    addressLine1: v.addressLine1,
    addressLine2: orNull(v.addressLine2),
    city: v.city,
    state: orNull(v.district),
    postalCode: orNull(v.postalCode),
    country: orNull(v.country) ?? "Sri Lanka",
    emergencyContactName: v.emergencyContactName,
    emergencyContactRelationship: v.emergencyContactRelationship,
    emergencyContactPhone: v.emergencyContactPhone,
    insuranceProvider: insurance(v.insuranceProvider),
    insurancePolicyNumber: insurance(v.insurancePolicyNumber),
    insuranceGroupNumber: insurance(v.insuranceGroupNumber),
    insuranceExpiryDate: insurance(v.insuranceExpiryDate),
    insuranceHolderName: insurance(v.insuranceHolderName),
    insuranceRelationship: insured ? v.insuranceRelationship : null,
    tags: parseTags(v.tags),
  };
}

/** A new allergy. The forms collect only a substance, so its code is the lower-cased substance, as in the seed. */
export function newAllergy(entry: AllergyEntry): NewAllergyBody {
  const display = entry.substance.trim();
  return {
    code: display.toLowerCase(),
    display,
    reaction: entry.reaction.trim() || undefined,
    severity: entry.severity,
    note: entry.notes.trim() || undefined,
  };
}

/** The body for `POST /patients`: the patient and their allergies, saved together. */
export const registrationBody = (v: PatientFormValues) => ({
  ...patientBody(v),
  allergies: v.allergies.map(newAllergy),
});

/** The fields of a recorded allergy that an entry changes, or null if it changes none. */
function changedFields(recorded: Allergy, entry: AllergyEntry): Partial<NewAllergyBody> | null {
  const next = newAllergy(entry);
  const reaction = next.reaction ?? "";
  const note = next.note ?? "";
  const change: Partial<NewAllergyBody> = {};
  if (next.display !== recorded.substance) Object.assign(change, { code: next.code, display: next.display });
  if (reaction !== recorded.reaction) change.reaction = reaction;
  if (next.severity !== recorded.severity) change.severity = next.severity;
  if (note !== recorded.notes) change.note = note;
  return Object.keys(change).length ? change : null;
}

/**
 * The allergy part of an update body, from the allergies on record and the form's
 * full list: an entry without an id is new, a changed entry is an update, and a
 * recorded allergy no longer listed is retired. Only doctors and super admins
 * may send updates.
 */
export function allergyChanges(recorded: Allergy[], entries: AllergyEntry[]) {
  const listed = new Map(entries.filter((e) => e.id).map((e) => [e.id, e]));
  const allergyUpdates = recorded.flatMap((allergy): AllergyUpdateBody[] => {
    const entry = listed.get(allergy.id);
    if (!entry) return [{ id: allergy.id, clinicalStatus: "inactive" }];
    const change = changedFields(allergy, entry);
    return change ? [{ id: allergy.id, ...change }] : [];
  });
  return {
    newAllergies: entries.filter((e) => !e.id).map(newAllergy),
    allergyUpdates,
  };
}
