import fs from 'fs/promises';
import path from 'path';
import {
  Patient, Allergy, Problem, Appointment, Encounter, ICD10,
  Medication, Prescription, LabTestCatalogItem, LabOrder, Task
} from '@/types';

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

// Generic writer — throws on failure so callers can handle errors
async function writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
  const filePath = getDataPath(filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// --- PATIENTS ---
export async function getPatients(): Promise<Patient[]> {
  return readJsonFile<Patient>('patients.json');
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const patients = await getPatients();
  return patients.find(p => p.id === id) || null;
}

// --- APPOINTMENTS ---
export async function getAppointments(): Promise<Appointment[]> {
  return readJsonFile<Appointment>('appointments.json');
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter(a => a.date === date);
}

export async function updateAppointment(updated: Appointment): Promise<void> {
  const appts = await getAppointments();
  const index = appts.findIndex(a => a.id === updated.id);
  if (index >= 0) {
    appts[index] = updated;
    await writeJsonFile('appointments.json', appts);
  }
}

// --- ENCOUNTERS ---
export async function getEncounters(): Promise<Encounter[]> {
  return readJsonFile<Encounter>('encounters.json');
}

export async function getEncountersByPatient(patientId: string): Promise<Encounter[]> {
  const encs = await getEncounters();
  return encs
    .filter(e => e.patientId === patientId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export async function getEncounterById(id: string): Promise<Encounter | null> {
  const encs = await getEncounters();
  return encs.find(e => e.id === id) || null;
}

export async function createEncounter(encounter: Encounter): Promise<void> {
  const encs = await getEncounters();
  encs.push(encounter);
  await writeJsonFile('encounters.json', encs);
}

export async function updateEncounter(updated: Encounter): Promise<void> {
  const encs = await getEncounters();
  const index = encs.findIndex(e => e.id === updated.id);
  if (index >= 0) {
    encs[index] = updated;
    await writeJsonFile('encounters.json', encs);
  }
}

// --- ALLERGIES ---
export async function getAllAllergies(): Promise<Allergy[]> {
  return readJsonFile<Allergy>('allergies.json');
}

export async function getAllergies(patientId: string): Promise<Allergy[]> {
  const allergies = await readJsonFile<Allergy>('allergies.json');
  return allergies.filter(a => a.patientId === patientId);
}

// --- PROBLEMS ---
export async function getProblems(patientId: string): Promise<Problem[]> {
  const probs = await readJsonFile<Problem>('problems.json');
  return probs.filter(p => p.patientId === patientId);
}

// --- LABS ---
export async function getLabOrders(): Promise<LabOrder[]> {
  return readJsonFile<LabOrder>('lab-orders.json');
}

export async function getLabOrdersByPatient(patientId: string): Promise<LabOrder[]> {
  const labs = await getLabOrders();
  return labs.filter(l => l.patientId === patientId);
}

export async function getPendingLabOrders(): Promise<LabOrder[]> {
  const labs = await getLabOrders();
  return labs.filter(l => l.status === 'results_pending' && !l.review.isReviewed);
}

export async function getLabOrdersByEncounter(encounterId: string): Promise<LabOrder[]> {
  const labs = await getLabOrders();
  return labs.filter(l => l.encounterId === encounterId);
}

export async function createLabOrder(order: LabOrder): Promise<void> {
  const labs = await getLabOrders();
  labs.push(order);
  await writeJsonFile('lab-orders.json', labs);
}

export async function updateLabOrder(updated: LabOrder): Promise<void> {
  const labs = await getLabOrders();
  const index = labs.findIndex(l => l.id === updated.id);
  if (index >= 0) {
    labs[index] = updated;
    await writeJsonFile('lab-orders.json', labs);
  }
}

// --- PRESCRIPTIONS ---
export async function getPrescriptionsByEncounter(encounterId: string): Promise<Prescription[]> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  return rxs.filter(r => r.encounterId === encounterId);
}

export async function getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  return rxs.filter(r => r.patientId === patientId);
}

export async function createPrescription(rx: Prescription): Promise<void> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  rxs.push(rx);
  await writeJsonFile('prescriptions.json', rxs);
}

export async function updatePrescription(updated: Prescription): Promise<void> {
  const rxs = await readJsonFile<Prescription>('prescriptions.json');
  const index = rxs.findIndex(r => r.id === updated.id);
  if (index >= 0) {
    rxs[index] = updated;
    await writeJsonFile('prescriptions.json', rxs);
  }
}

// --- CATALOGS ---
export async function getICD10Subset(): Promise<ICD10[]> {
  return readJsonFile<ICD10>('icd10.json');
}

export async function getMedicationCatalog(): Promise<Medication[]> {
  return readJsonFile<Medication>('medications.json');
}

export async function getLabTestCatalog(): Promise<LabTestCatalogItem[]> {
  return readJsonFile<LabTestCatalogItem>('lab-tests.json');
}

// --- TASKS ---
export async function getTasks(): Promise<Task[]> {
  return readJsonFile<Task>('tasks.json');
}

export async function getOpenTasks(): Promise<Task[]> {
  const tasks = await getTasks();
  return tasks.filter(t => t.status === 'open' || t.status === 'in_progress');
}
