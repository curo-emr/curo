import fs from 'fs/promises';
import path from 'path';
import {
  Patient, Prescription, Medication,
  DispensingRecord, PharmacyStaff, StockTransaction
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

// --- PRESCRIPTIONS ---
export async function getPrescriptions(): Promise<Prescription[]> {
  return readJsonFile<Prescription>('prescriptions.json');
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  const prescriptions = await getPrescriptions();
  return prescriptions.find(p => p.id === id) || null;
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  return prescriptions.filter(p => p.patientId === patientId);
}

export async function getPrescriptionsByStatus(status: string): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  return prescriptions.filter(p => p.status === status);
}

export async function getUrgentPrescriptions(): Promise<Prescription[]> {
  const prescriptions = await getPrescriptions();
  return prescriptions.filter(p =>
    (p.priority === 'urgent' || p.priority === 'stat') &&
    !['dispensed', 'cancelled', 'expired'].includes(p.status)
  );
}

// --- MEDICATIONS ---
export async function getMedications(): Promise<Medication[]> {
  return readJsonFile<Medication>('medications.json');
}

export async function getMedicationById(id: string): Promise<Medication | null> {
  const medications = await getMedications();
  return medications.find(m => m.id === id) || null;
}

export async function getLowStockMedications(): Promise<Medication[]> {
  const medications = await getMedications();
  return medications.filter(m => m.stockQuantity <= m.reorderLevel && m.isActive);
}

// --- DISPENSING RECORDS ---
export async function getDispensingRecords(): Promise<DispensingRecord[]> {
  return readJsonFile<DispensingRecord>('dispensing-records.json');
}

export async function getDispensingRecordsByPrescription(prescriptionId: string): Promise<DispensingRecord[]> {
  const records = await getDispensingRecords();
  return records.filter(r => r.prescriptionId === prescriptionId);
}

export async function getDispensingRecordsByPatient(patientId: string): Promise<DispensingRecord[]> {
  const records = await getDispensingRecords();
  return records.filter(r => r.patientId === patientId);
}

// --- PHARMACY STAFF ---
export async function getPharmacyStaff(): Promise<PharmacyStaff[]> {
  return readJsonFile<PharmacyStaff>('pharmacy-staff.json');
}

export async function getPharmacyStaffById(id: string): Promise<PharmacyStaff | null> {
  const staff = await getPharmacyStaff();
  return staff.find(s => s.id === id) || null;
}

// --- STOCK TRANSACTIONS ---
export async function getStockTransactions(): Promise<StockTransaction[]> {
  return readJsonFile<StockTransaction>('stock-transactions.json');
}

export async function getStockTransactionsByMedication(medicationId: string): Promise<StockTransaction[]> {
  const transactions = await getStockTransactions();
  return transactions.filter(t => t.medicationId === medicationId);
}
