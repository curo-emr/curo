import fs from 'fs/promises';
import path from 'path';
import {
  Patient, Allergy, Problem, Appointment, Encounter,
  Medication, Prescription, LabTestCatalogItem, LabOrder, Doctor
} from '@/types';
import { CURRENT_PATIENT_ID } from '@/lib/constants';

// Helper to get raw data path
const getDataPath = (filename: string) => path.join(process.cwd(), 'data', filename);

// Generic reader — returns empty array on failure
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

// --- CURRENT PATIENT ---
export async function getCurrentPatient(): Promise<Patient | null> {
  const patients = await readJsonFile<Patient>('patients.json');
  return patients.find(p => p.id === CURRENT_PATIENT_ID) || null;
}

// --- DOCTORS ---
export async function getDoctors(): Promise<Doctor[]> {
  return readJsonFile<Doctor>('doctors.json');
}

export async function getDoctorById(id: string): Promise<Doctor | null> {
  const doctors = await getDoctors();
  return doctors.find(d => d.id === id) || null;
}

// --- APPOINTMENTS (filtered to current patient) ---
export async function getPatientAppointments(): Promise<Appointment[]> {
  const appointments = await readJsonFile<Appointment>('appointments.json');
  return appointments
    .filter(a => a.patientId === CURRENT_PATIENT_ID)
    .sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
}

export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const appointments = await getPatientAppointments();
  const today = new Date().toISOString().split('T')[0];
  return appointments
    .filter(a => a.date >= today && a.status === 'scheduled')
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
}

export async function getPastAppointments(): Promise<Appointment[]> {
  const appointments = await getPatientAppointments();
  const today = new Date().toISOString().split('T')[0];
  return appointments.filter(a => a.date < today || a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');
}

// --- ENCOUNTERS (filtered to current patient) ---
export async function getPatientEncounters(): Promise<Encounter[]> {
  const encs = await readJsonFile<Encounter>('encounters.json');
  return encs
    .filter(e => e.patientId === CURRENT_PATIENT_ID)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function getEncounterById(id: string): Promise<Encounter | null> {
  const encs = await readJsonFile<Encounter>('encounters.json');
  const enc = encs.find(e => e.id === id);
  if (enc && enc.patientId !== CURRENT_PATIENT_ID) return null;
  return enc || null;
}

// --- ALLERGIES (filtered to current patient) ---
export async function getPatientAllergies(): Promise<Allergy[]> {
  const allergies = await readJsonFile<Allergy>('allergies.json');
  return allergies.filter(a => a.patientId === CURRENT_PATIENT_ID);
}

// --- PROBLEMS (filtered to current patient) ---
export async function getPatientProblems(): Promise<Problem[]> {
  const probs = await readJsonFile<Problem>('problems.json');
  return probs.filter(p => p.patientId === CURRENT_PATIENT_ID);
}

// --- PRESCRIPTIONS (filtered to current patient) ---
export async function getPatientPrescriptions(): Promise<Prescription[]> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  return rxs
    .filter(r => r.patientId === CURRENT_PATIENT_ID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPrescriptionById(id: string): Promise<Prescription | null> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  const rx = rxs.find(r => r.id === id);
  if (rx && rx.patientId !== CURRENT_PATIENT_ID) return null;
  return rx || null;
}

export async function getPrescriptionsByEncounter(encounterId: string): Promise<Prescription[]> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  return rxs.filter(r => r.encounterId === encounterId && r.patientId === CURRENT_PATIENT_ID);
}

// --- LAB ORDERS (filtered to current patient, respects showResultsToPatient) ---
export async function getPatientLabOrders(): Promise<LabOrder[]> {
  const labs = await readJsonFile<LabOrder>('lab-orders.json');
  return labs
    .filter(l => l.patientId === CURRENT_PATIENT_ID && l.showResultsToPatient)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getLabOrdersByEncounter(encounterId: string): Promise<LabOrder[]> {
  const labs = await readJsonFile<LabOrder>('lab-orders.json');
  return labs.filter(l => l.encounterId === encounterId && l.patientId === CURRENT_PATIENT_ID && l.showResultsToPatient);
}

// --- CATALOGS ---
export async function getMedicationCatalog(): Promise<Medication[]> {
  return readJsonFile<Medication>('medications.json');
}

export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return readJsonFile<LabTestCatalogItem>('lab-tests.json');
}
