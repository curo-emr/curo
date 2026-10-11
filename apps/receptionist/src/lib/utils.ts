export { cn } from "@curo/web/ui/utils";
export { getDoctorName, getPatientName, getTodayString } from "@curo/web/format";

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
