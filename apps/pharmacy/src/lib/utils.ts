export { cn } from "@curo/web/ui/utils";
export { getPatientName, getStaffName } from "@curo/web/format";

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
