import { apiClient, apiErrorMessage } from "@curo/web/api";
import {
  allergyChanges, patientBody, patientFormSchema, registrationBody,
  type PatientFormValues,
} from "@curo/web/patients";
import { mapFhirPatient, type FhirPatient } from "@/lib/api/mappers";
import type { Allergy } from "@/types";

export async function registerPatient(data: PatientFormValues) {
  const parsed = patientFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const res = await apiClient.post<FhirPatient>("/patients", registrationBody(parsed.data));
    const patient = mapFhirPatient(res.data);
    return { success: true, patientId: patient.id, patientCode: patient.mrn };
  } catch (err) {
    return { success: false, error: apiErrorMessage(err, "Failed to register patient") };
  }
}

/** Saves an edit. A recorded allergy that `data` no longer lists is retired. */
export async function updatePatientDemographics(
  patientId: string,
  data: PatientFormValues,
  recordedAllergies: Allergy[],
) {
  const parsed = patientFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const v = parsed.data;
  try {
    await apiClient.patch(`/patients/${patientId}`, { ...patientBody(v), ...allergyChanges(recordedAllergies, v.allergies) });
    return { success: true };
  } catch (err) {
    return { success: false, error: apiErrorMessage(err, "Failed to update patient") };
  }
}
