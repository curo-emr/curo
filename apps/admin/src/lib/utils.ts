export { cn } from "@curo/web/ui/utils";

export function calculateBMI(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export type BMICategory = 'normal' | 'overweight' | 'obese';

export function getBMICategory(bmi: number): BMICategory {
  if (bmi >= 30) return 'obese';
  if (bmi >= 25) return 'overweight';
  return 'normal';
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function calculateAge(dobStr: string): number {
  if (!dobStr) return 0;
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

/**
 * Converts a snake_case status string to human-readable Title Case.
 * e.g. "sent_to_pharmacy" → "Sent To Pharmacy"
 */
export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Returns today's date as a YYYY-MM-DD string in local time.
 */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Look up a patient's full name by ID.
 */
export function getPatientName(id: string, patients: { id: string; name: { full: string } }[]): string {
  return patients.find(p => p.id === id)?.name.full || "Unknown Patient";
}

/**
 * Look up a patient's age and sex by ID.
 */
export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}

/**
 * Look up a lab test display name from catalog by test ID.
 */
export function getTestName(testId: string, catalog: { id: string; name: string; code: string }[]): string {
  const test = catalog.find(t => t.id === testId);
  return test ? `${test.name} (${test.code})` : testId;
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

export function calculateWaitTime(checkInTime: string): number {
  if (!checkInTime) return 0;
  const checkIn = new Date(checkInTime);
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - checkIn.getTime()) / 60000));
}

export function getDoctorName(id: string, doctors: { id: string; name: { full: string } }[]): string {
  return doctors.find(d => d.id === id)?.name.full || "Unknown Doctor";
}

export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}` : uuid;
}

export function generateMRN(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `MRN-${num}`;
}

/**
 * Returns the left-border color class for a given appointment status.
 */
export function getStatusBorderClass(status: string): string {
  switch (status) {
    case 'waiting': return 'border-l-4 border-l-status-warning-text';
    case 'in_progress': return 'border-l-4 border-l-primary';
    case 'completed': return 'border-l-4 border-l-status-success-text';
    default: return 'border-l-4 border-l-border';
  }
}
