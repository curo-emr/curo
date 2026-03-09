import fs from 'fs/promises';
import path from 'path';
import { Patient, Allergy, Problem, Appointment, Doctor, Visit } from '@/types';

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

// No-op: demo mode — data resets on reload
export async function createPatient(_patient: Patient): Promise<void> {}

// No-op: demo mode — data resets on reload
export async function updatePatient(_updated: Patient): Promise<void> {}

// --- APPOINTMENTS ---
export async function getAppointments(): Promise<Appointment[]> {
  return readJsonFile<Appointment>('appointments.json');
}

export async function getAppointmentsByDate(date: string): Promise<Appointment[]> {
  const appointments = await getAppointments();
  return appointments.filter(a => a.date === date);
}

export async function getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
  const appts = await getAppointments();
  return appts.filter(a => a.doctorId === doctorId);
}

export async function getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
  const appts = await getAppointments();
  return appts.filter(a => a.patientId === patientId);
}

// No-op: demo mode — data resets on reload
export async function createAppointment(_appointment: Appointment): Promise<void> {}

// No-op: demo mode — data resets on reload
export async function updateAppointment(_updated: Appointment): Promise<void> {}

// --- DOCTORS ---
export async function getDoctors(): Promise<Doctor[]> {
  return readJsonFile<Doctor>('doctors.json');
}

export async function getDoctorById(id: string): Promise<Doctor | null> {
  const docs = await getDoctors();
  return docs.find(d => d.id === id) || null;
}

// --- VISITS ---
export async function getVisits(): Promise<Visit[]> {
  return readJsonFile<Visit>('visits.json');
}

export async function getVisitsByDate(date: string): Promise<Visit[]> {
  const visits = await getVisits();
  return visits.filter(v => v.date === date);
}

export async function getVisitsByPatient(patientId: string): Promise<Visit[]> {
  const visits = await getVisits();
  return visits.filter(v => v.patientId === patientId);
}

// No-op: demo mode — data resets on reload
export async function createVisit(_visit: Visit): Promise<void> {}

// No-op: demo mode — data resets on reload
export async function updateVisit(_updated: Visit): Promise<void> {}

// --- ALLERGIES ---
export async function getAllAllergies(): Promise<Allergy[]> {
  return readJsonFile<Allergy>('allergies.json');
}

export async function getAllergies(patientId: string): Promise<Allergy[]> {
  const allergies = await readJsonFile<Allergy>('allergies.json');
  return allergies.filter(a => a.patientId === patientId);
}

// No-op: demo mode — data resets on reload
export async function createAllergies(_allergies: Allergy[]): Promise<void> {}

// No-op: demo mode — data resets on reload
export async function replacePatientAllergies(_patientId: string, _allergies: Allergy[]): Promise<void> {}

// --- PROBLEMS ---
export async function getProblems(patientId: string): Promise<Problem[]> {
  const probs = await readJsonFile<Problem>('problems.json');
  return probs.filter(p => p.patientId === patientId);
}
