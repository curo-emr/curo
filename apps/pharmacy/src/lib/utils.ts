export { cn } from "@curo/web/ui/utils";
export { getPatientName, getStaffName } from "@curo/web/format";

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(iso: string | number | Date): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(new Date(iso).toISOString());
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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

export function getPatientMeta(id: string, patients: { id: string; dob: string; sex: string }[]): { age: number; sex: string } | null {
  const p = patients.find(pat => pat.id === id);
  if (!p) return null;
  return { age: calculateAge(p.dob), sex: p.sex };
}

export function getMedicationName(id: string, medications: { id: string; genericName: string; brandName: string }[]): string {
  const med = medications.find(m => m.id === id);
  return med ? `${med.genericName} (${med.brandName})` : id;
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'stat': return 'text-status-error-text bg-status-error-bg border-status-error-border';
    case 'urgent': return 'text-status-warning-text bg-status-warning-bg border-status-warning-border';
    case 'routine': return 'text-muted-foreground bg-muted border';
    default: return 'text-muted-foreground bg-muted border';
  }
}

export function getPrescriptionStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'text-status-warning-text bg-status-warning-bg border-status-warning-border';
    case 'processing': return 'text-status-info-text bg-status-info-bg border-status-info-border';
    case 'dispensed': return 'text-status-success-text bg-status-success-bg border-status-success-border';
    case 'partially_dispensed': return 'text-status-purple-text bg-status-purple-bg border-status-purple-border';
    case 'on_hold': return 'text-status-teal-text bg-status-teal-bg border-status-teal-border';
    case 'cancelled': return 'text-status-error-text bg-status-error-bg border-status-error-border';
    case 'expired': return 'text-status-neutral-text bg-status-neutral-bg border-status-neutral-border';
    default: return 'text-muted-foreground bg-muted border';
  }
}

export function getStockLevelColor(current: number, reorderLevel: number): string {
  const ratio = current / reorderLevel;
  if (ratio <= 0.5) return 'text-status-error-text';
  if (ratio <= 1) return 'text-status-warning-text';
  return 'text-status-success-text';
}

export function getTransactionTypeColor(type: string): string {
  switch (type) {
    case 'purchase': return 'text-status-success-text bg-status-success-bg';
    case 'dispensed': return 'text-status-info-text bg-status-info-bg';
    case 'return': return 'text-status-teal-text bg-status-teal-bg';
    case 'adjustment': return 'text-status-warning-text bg-status-warning-bg';
    case 'expired': return 'text-status-error-text bg-status-error-bg';
    case 'damaged': return 'text-status-error-text bg-status-error-bg';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function isExpiringSoon(expiryDate: string, daysThreshold: number = 90): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays >= 0;
}

export function daysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate);
  const now = new Date();
  return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatAllergies(allergies: { substance: string; severity: string }[]): string {
  return allergies.map(a => `${a.substance} (${a.severity})`).join(', ');
}
