export { cn } from "@curo/web/ui/utils";
export { getPatientName, getStaffName } from "@curo/web/format";

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

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}

export function getResultFlagLabel(flag: string): string {
  switch (flag) {
    case 'normal': return 'Normal';
    case 'low': return 'Low';
    case 'high': return 'High';
    case 'critical': return 'Critical';
    case 'abnormal': return 'Abnormal';
    default: return flag;
  }
}

export function isResultAbnormal(flag: string): boolean {
  return flag !== 'normal';
}

export function isResultCritical(flag: string): boolean {
  return flag === 'critical';
}

export function formatTAT(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
