// Re-exports for backward compatibility — all data now fetched from the backend API.
export {
  getMyProfile as getCurrentPatient,
  getMyAppointments as getPatientAppointments,
  getMyAllergies as getPatientAllergies,
  getMyConditions as getPatientProblems,
  getMyPrescriptions as getPatientPrescriptions,
  getMyLabOrders as getPatientLabOrders,
} from '@/lib/api/patient-portal';

export async function getDoctors() { return []; }
export async function getDoctorById() { return null; }
export async function getPatientEncounters() { return []; }
export async function getPrescriptionById() { return null; }
export async function getEncounterById() { return null; }

// Catalog readers — DB-backed endpoints via the gateway.
export { getLabTestCatalog } from '@/lib/api/catalog';
