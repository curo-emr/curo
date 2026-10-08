import { apiClient, apiErrorMessage } from "@curo/web/api";
import { allergyChanges, patientBody, registrationBody } from "@curo/web/patients";
import { mapFhirPatient, type FhirPatient } from "@/lib/api/mappers";
import { patientRegistrationSchema, type PatientRegistrationInput } from "@/lib/validations/patient";
import type { Allergy } from "@/types";

export async function registerPatient(data: PatientRegistrationInput) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  try {
    const res = await apiClient.post<FhirPatient>("/patients", registrationBody(parsed.data));
    const patient = mapFhirPatient(res.data);
    return { success: true, patientId: patient.id, patientCode: patient.mrn };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to register patient");
    return { success: false, error: { _form: [msg] } };
  }
}

/** Saves an edit. A recorded allergy that `data` no longer lists is retired. */
export async function updatePatientDemographics(
  patientId: string,
  data: PatientRegistrationInput,
  recordedAllergies: Allergy[],
) {
  const parsed = patientRegistrationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors };
  }

  const v = parsed.data;
  try {
    await apiClient.patch(`/patients/${patientId}`, { ...patientBody(v), ...allergyChanges(recordedAllergies, v.allergies) });
    return { success: true };
  } catch (err) {
    const msg = apiErrorMessage(err, "Failed to update patient");
    return { success: false, error: { _form: [msg] } };
  }
}
