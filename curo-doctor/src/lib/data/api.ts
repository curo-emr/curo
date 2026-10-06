// Re-exports for backward compatibility — all data is now fetched from the backend API,
// including the ICD-10, medication, and lab-test catalogs (DB-backed endpoints).
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

// Catalog readers — DB-backed endpoints via the gateway.
export { getICD10Subset } from '@/lib/api/icd';
export { getMedicationCatalog } from '@/lib/api/medications';
export { getLabTestCatalog } from '@/lib/api/catalog';

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
