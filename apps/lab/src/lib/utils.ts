export { cn } from "@curo/web/ui/utils";

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

export function formatStatus(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getPatientName(id: string, patients: { id: string; name: { full: string } }[]): string {
  return patients.find(p => p.id === id)?.name.full || "Unknown Patient";
}

export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}

export function getStaffName(id: string, staff: { id: string; name: { full: string } }[]): string {
  return staff.find(s => s.id === id)?.name.full || "Unknown Staff";
}

export function getResultFlagColor(flag: string): string {
  switch (flag) {
    case 'normal': return 'text-status-success-text bg-status-success-bg';
    case 'low': return 'text-status-info-text bg-status-info-bg';
    case 'high': return 'text-status-warning-text bg-status-warning-bg';
    case 'critical': return 'text-status-error-text bg-status-error-bg';
    case 'abnormal': return 'text-status-purple-text bg-status-purple-bg';
    default: return 'text-foreground bg-muted';
  }
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

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'stat': return 'text-status-error-text bg-status-error-bg border-status-error-border';
    case 'urgent': return 'text-status-warning-text bg-status-warning-bg border-status-warning-border';
    case 'routine': return 'text-muted-foreground bg-muted border';
    default: return 'text-muted-foreground bg-muted border';
  }
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'received': return 'text-status-info-text bg-status-info-bg border-status-info-border';
    case 'collected': return 'text-status-teal-text bg-status-teal-bg border-status-teal-border';
    case 'processing': return 'text-status-info-text bg-status-info-bg border-status-info-border';
    case 'resulted': return 'text-status-purple-text bg-status-purple-bg border-status-purple-border';
    case 'verified': return 'text-status-success-text bg-status-success-bg border-status-success-border';
    case 'dispatched': return 'text-status-success-text bg-status-success-bg border-status-success-border';
    case 'rejected': return 'text-status-error-text bg-status-error-bg border-status-error-border';
    default: return 'text-muted-foreground bg-muted border';
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
