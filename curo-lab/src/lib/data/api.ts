import fs from 'fs/promises';
import path from 'path';
import {
  Patient, LabOrder, LabResult, LabTestCatalogItem,
  LabStaff, QCLog, LabInstrument
} from '@/types';

const getDataPath = (filename: string) => path.join(process.cwd(), 'data', filename);

async function readJsonFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = getDataPath(filename);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T[];
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// --- PATIENTS ---
export async function getPatients(): Promise<Patient[]> {
  return readJsonFile<Patient>('patients.json');
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const patients = await getPatients();
  return patients.find(p => p.id === id) || null;
}

// --- LAB ORDERS ---
export async function getLabOrders(): Promise<LabOrder[]> {
  return readJsonFile<LabOrder>('lab-orders.json');
}

export async function getLabOrderById(id: string): Promise<LabOrder | null> {
  const orders = await getLabOrders();
  return orders.find(o => o.id === id) || null;
}

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  const orders = await getLabOrders();
  return orders.filter(o => o.patientId === patientId);
}

export async function getLabOrdersByStatus(status: string): Promise<LabOrder[]> {
  const orders = await getLabOrders();
  return orders.filter(o => o.status === status);
}

export async function getUrgentLabOrders(): Promise<LabOrder[]> {
  const orders = await getLabOrders();
  return orders.filter(o =>
    (o.priority === 'urgent' || o.priority === 'stat') &&
    !['verified', 'dispatched', 'rejected'].includes(o.status)
  );
}

// --- LAB RESULTS ---
export async function getLabResults(): Promise<LabResult[]> {
  return readJsonFile<LabResult>('lab-results.json');
}

export async function getLabResultsByOrder(orderId: string): Promise<LabResult[]> {
  const results = await getLabResults();
  return results.filter(r => r.orderId === orderId);
}

export async function getLabResultsByPatient(patientId: string): Promise<LabResult[]> {
  const results = await getLabResults();
  return results.filter(r => r.patientId === patientId);
}

// --- LAB TEST CATALOG ---
export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return readJsonFile<LabTestCatalogItem>('lab-tests.json');
}

export async function getLabTestById(id: string): Promise<LabTestCatalogItem | null> {
  const tests = await getLabTestCatalog();
  return tests.find(t => t.id === id) || null;
}

// --- LAB STAFF ---
export async function getLabStaff(): Promise<LabStaff[]> {
  return readJsonFile<LabStaff>('lab-staff.json');
}

export async function getLabStaffById(id: string): Promise<LabStaff | null> {
  const staff = await getLabStaff();
  return staff.find(s => s.id === id) || null;
}

// --- QC LOGS ---
export async function getQCLogs(): Promise<QCLog[]> {
  return readJsonFile<QCLog>('qc-logs.json');
}

export async function getQCLogsByInstrument(instrumentId: string): Promise<QCLog[]> {
  const logs = await getQCLogs();
  return logs.filter(l => l.instrumentId === instrumentId);
}

// --- LAB INSTRUMENTS ---
export async function getLabInstruments(): Promise<LabInstrument[]> {
  return readJsonFile<LabInstrument>('lab-instruments.json');
}

export async function getLabInstrumentById(id: string): Promise<LabInstrument | null> {
  const instruments = await getLabInstruments();
  return instruments.find(i => i.id === id) || null;
}
