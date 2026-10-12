export { cn } from "@curo/web/ui/utils";
export { formatDate, formatDateTime } from "@curo/web/format";

/** A duration in minutes, as "45 min" or "5h 20m". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}
