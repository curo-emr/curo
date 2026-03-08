"use server";

import { createPatient, updatePatient, getPatientById } from "@/lib/data/api";
import { patientRegistrationSchema, type PatientRegistrationInput } from "@/lib/validations/patient";
import { generateId, generateMRN } from "@/lib/utils";
import type { Patient } from "@/types";

export async function registerPatient(data: PatientRegistrationInput) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;
  const patientId = generateId("pat");
  const mrn = generateMRN();
  const now = new Date().toISOString();

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
    allergies: [],
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
    updatedAt: now,
  };

  // No-op in demo mode — data resets on reload
  await updatePatient(updated);

  return { success: true };
}
