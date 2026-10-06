// Re-exports for backward compatibility — all data now fetched from the backend API.
export {
  getPendingPrescriptions as getPrescriptions,
  getPrescriptionsByPatient,
  getDispensingRecords,
  getDispensingRecordsByPatient,
  getDispensingRecordsByPrescription,
  getStock as getMedications,
  getLowStockAlerts,
} from '@/lib/api/pharmacy';

export {
  getPatients,
  getPatientById,
} from '@/lib/api/patients';

// Stubs for removed functionality
export async function getPharmacyStaff() { return []; }
export async function getPrescriptionById(id: string) {
  const { getPrescriptionsByPatient } = await import('@/lib/api/pharmacy');
  return null; // Can't look up by ID without patient context
}
