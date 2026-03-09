"use server";

import { createPatient, updatePatient, getPatientById, createAllergies, replacePatientAllergies } from "@/lib/data/api";
import { patientRegistrationSchema, type PatientRegistrationInput } from "@/lib/validations/patient";
import { generateId, generateMRN } from "@/lib/utils";
import type { Patient, Allergy } from "@/types";

export async function registerPatient(data: PatientRegistrationInput) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;
  const patientId = generateId("pat");
  const mrn = generateMRN();
  const now = new Date().toISOString();

  const allergyRecords: Allergy[] = (v.allergies ?? []).map(a => ({
    id: generateId("alg"),
    patientId,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    notes: a.notes ?? "",
    recordedAt: now,
  }));

  const patient: Patient = {
    id: patientId,
    mrn,
    nic: v.nic,
    name: {
      first: v.firstName,
      last: v.lastName,
      full: `${v.firstName} ${v.lastName}`,
    },
    dob: v.dob,
    sex: v.sex,
    bloodType: v.bloodType || "",
    nationality: v.nationality || "Sri Lankan",
    maritalStatus: v.maritalStatus || "single",
    occupation: v.occupation || "",
    phone: v.phone,
    email: v.email || "",
    address: {
      line1: v.addressLine1,
      line2: v.addressLine2 || "",
      city: v.city,
      district: v.district || "",
      postalCode: v.postalCode || "",
      country: v.country || "Sri Lanka",
    },
    emergencyContact: {
      name: v.emergencyContactName,
      relationship: v.emergencyContactRelationship,
      phone: v.emergencyContactPhone,
    },
    insurance: v.insuranceProvider
      ? {
          provider: v.insuranceProvider,
          policyNumber: v.insurancePolicyNumber || "",
          groupNumber: v.insuranceGroupNumber || "",
          expiryDate: v.insuranceExpiryDate || "",
          holderName: v.insuranceHolderName || "",
          relationship: v.insuranceRelationship || "self",
        }
      : null,
    allergies: allergyRecords.map(a => a.id),
    problemList: [],
    currentMedications: [],
    tags: v.tags ? v.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    registeredBy: "rec_8001",
    registeredAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // No-op in demo mode — data resets on reload
  await createPatient(patient);
  await createAllergies(allergyRecords);

  return { success: true, patientId };
}

export async function updatePatientDemographics(
  patientId: string,
  data: PatientRegistrationInput
) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const existing = await getPatientById(patientId);
  if (!existing) {
    return { success: false, error: { _form: ["Patient not found"] } };
  }

  const v = parsed.data;
  const now = new Date().toISOString();

  const allergyRecords: Allergy[] = (v.allergies ?? []).map(a => ({
    id: generateId("alg"),
    patientId,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    notes: a.notes ?? "",
    recordedAt: now,
  }));

  const updated: Patient = {
    ...existing,
    nic: v.nic,
    name: {
      first: v.firstName,
      last: v.lastName,
      full: `${v.firstName} ${v.lastName}`,
    },
    dob: v.dob,
    sex: v.sex,
    bloodType: v.bloodType || "",
    nationality: v.nationality || "Sri Lankan",
    maritalStatus: v.maritalStatus || "single",
    occupation: v.occupation || "",
    phone: v.phone,
    email: v.email || "",
    address: {
      line1: v.addressLine1,
      line2: v.addressLine2 || "",
      city: v.city,
      district: v.district || "",
      postalCode: v.postalCode || "",
      country: v.country || "Sri Lanka",
    },
    emergencyContact: {
      name: v.emergencyContactName,
      relationship: v.emergencyContactRelationship,
      phone: v.emergencyContactPhone,
    },
    insurance: v.insuranceProvider
      ? {
          provider: v.insuranceProvider,
          policyNumber: v.insurancePolicyNumber || "",
          groupNumber: v.insuranceGroupNumber || "",
          expiryDate: v.insuranceExpiryDate || "",
          holderName: v.insuranceHolderName || "",
          relationship: v.insuranceRelationship || "self",
        }
      : null,
    tags: v.tags ? v.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    allergies: allergyRecords.map(a => a.id),
    updatedAt: now,
  };

  // No-op in demo mode — data resets on reload
  await updatePatient(updated);
  await replacePatientAllergies(patientId, allergyRecords);

  return { success: true };
}
