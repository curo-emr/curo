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

import labTestsData from '../../../data/lab-tests.json';
import medicationsData from '../../../data/medications.json';
import type { LabTestCatalogItem, Medication } from '@/types';

export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return labTestsData as LabTestCatalogItem[];
}

export async function getMedicationCatalog(): Promise<Medication[]> {
  return medicationsData as Medication[];
}
