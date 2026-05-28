// Re-exports for backward compatibility — all data is now fetched from the backend API.
// Static catalogs (ICD10, medications, lab tests) are still served from local JSON files.
export {
  getPatients,
  getPatientById,
  getPatientByCode,
  getAllergies,
  getConditions as getProblems,
} from '@/lib/api/patients';

export {
  getAppointments,
  getAppointmentsByDate,
  updateAppointment,
  createAppointment,
} from '@/lib/api/appointments';

export {
  getEncountersByPatient,
  getEncounterById,
  createEncounter,
  updateEncounterStatus,
} from '@/lib/api/encounters';

export {
  getPrescriptionsByPatient,
  getPendingLabOrders,
  getLabOrdersByPatient,
  createPrescription,
  createLabOrder,
} from '@/lib/api/clinical';

export {
  getTasks,
  getOpenTasks,
} from '@/lib/api/tasks';

// Static catalog readers — bundled at compile time
import icd10Data from '../../data/icd10.json';
import medicationsData from '../../data/medications.json';
import labTestsData from '../../data/lab-tests.json';
import type { ICD10, Medication, LabTestCatalogItem } from '@/types';

export async function getICD10Subset(): Promise<ICD10[]> {
  return icd10Data as ICD10[];
}

export async function getMedicationCatalog(): Promise<Medication[]> {
  return medicationsData as Medication[];
}

export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return labTestsData as LabTestCatalogItem[];
}

// These are no longer needed (data is persisted in the DB)
export async function getAllAllergies() { return []; }
export async function createAllergies() {}
export async function replacePatientAllergies() {}
export async function createEncounterLegacy() {}
export async function updateEncounterLegacy() {}
export async function createPrescriptionLegacy() {}
export async function updatePrescription() {}
export async function updateLabOrder() {}
export async function createLabOrderLegacy() {}
