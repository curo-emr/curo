// Re-exports for backward compatibility — all data now fetched from the backend API.
export {
  getLabOrders,
  getLabOrderById,
  getLabOrdersByPatient,
  receiveOrder,
  scanQR,
  enterResults,
  getLabResultsByOrder,
  getLabResultsByPatient,
  getLabInstruments,
  updateInstrumentStatus,
} from '@/lib/api/lab';

export {
  getPatients,
  getPatientById,
} from '@/lib/api/patients';

// Static catalog
import labTestsData from '../../data/lab-tests.json';
import type { LabTestCatalogItem } from '@/types';

export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return labTestsData as LabTestCatalogItem[];
}

// Stubs for removed functionality
export async function getUrgentLabOrders() { return []; }
export async function getQCLogs() { return []; }
export async function getLabStaff() { return []; }
