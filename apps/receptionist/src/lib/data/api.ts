// Re-exports for backward compatibility — all data is now fetched from the backend API.
export {
  getPatients,
  getPatientById,
  getPatientByCode,
  getAllergies,
} from '@/lib/api/patients';

export {
  getAppointments,
  getAppointmentsByDate,
  updateAppointment,
  createAppointment,
} from '@/lib/api/appointments';

export {
  getDoctors,
  getPractitioners,
} from '@/lib/api/practitioners';

// Stubs for removed file-system operations
export async function getAllAllergies() { return []; }
export async function createAllergies() {}
export async function replacePatientAllergies() {}
export async function createPatient() {}
export async function updatePatient() {}
export async function getProblems() { return []; }
export async function createVisit() {}
export async function updateVisit() {}
export async function getVisits() { return []; }
export async function getVisitsByDate() { return []; }
export async function getVisitsByPatient() { return []; }
export async function getDoctorById() { return null; }
