import { apiClient, apiErrorMessage } from "@curo/web/api";
import { mapFhirPatient, type FhirPatient } from "@/lib/api/mappers";
import { patientRegistrationSchema, type PatientRegistrationInput } from "@/lib/validations/patient";

export async function registerPatient(data: PatientRegistrationInput) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;

  const payload = {
    firstName: v.firstName,
    lastName: v.lastName,
    nic: v.nic,
    birthDate: v.dob,
    gender: v.sex,
    phone: v.phone,
    email: v.email || undefined,
    bloodType: v.bloodType || undefined,
    nationality: v.nationality || undefined,
    maritalStatus: v.maritalStatus || undefined,
    occupation: v.occupation || undefined,
    addressLine1: v.addressLine1,
    addressLine2: v.addressLine2 || undefined,
    city: v.city,
    state: v.district || undefined,
    postalCode: v.postalCode || undefined,
    country: v.country || "Sri Lanka",
    emergencyContactName: v.emergencyContactName,
    emergencyContactRelationship: v.emergencyContactRelationship,
    emergencyContactPhone: v.emergencyContactPhone,
  };

  try {
    const res = await apiClient.post<FhirPatient>("/patients", payload);
    const patient = mapFhirPatient(res.data);
    return { success: true, patientId: patient.id, patientCode: patient.mrn };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to register patient");
    return { success: false, error: { _form: [msg] } };
  }
}

export async function updatePatientDemographics(
  patientId: string,
  data: PatientRegistrationInput
) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;

  const payload = {
    firstName: v.firstName,
    lastName: v.lastName,
    nic: v.nic,
    birthDate: v.dob,
    gender: v.sex,
    phone: v.phone,
    email: v.email || undefined,
    bloodType: v.bloodType || undefined,
    nationality: v.nationality || undefined,
    maritalStatus: v.maritalStatus || undefined,
    occupation: v.occupation || undefined,
    addressLine1: v.addressLine1,
    addressLine2: v.addressLine2 || undefined,
    city: v.city,
    state: v.district || undefined,
    postalCode: v.postalCode || undefined,
    country: v.country || "Sri Lanka",
    emergencyContactName: v.emergencyContactName,
    emergencyContactRelationship: v.emergencyContactRelationship,
    emergencyContactPhone: v.emergencyContactPhone,
  };

  try {
    await apiClient.patch(`/patients/${patientId}`, payload);
    return { success: true };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to update patient");
    return { success: false, error: { _form: [msg] } };
  }
}
