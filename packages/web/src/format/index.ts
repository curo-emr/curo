/** A snake_case code as sentence-case text, the way the portals show statuses: `not_arrived` → "Not arrived". */
export function formatStatus(code: string): string {
  const words = code.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** How long ago a moment was, as "just now", "5 min ago" or "3 h ago"; older than a day, its date. */
export function formatRelative(moment: string | number | Date): string {
  const date = new Date(moment);
  const min = Math.round((Date.now() - date.getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Named = { id: string; name: { full: string } };

/** The full name of whoever in `people` has `id`, or `fallback` when no one does. */
export function nameById(id: string, people: readonly Named[], fallback: string): string {
  return people.find(p => p.id === id)?.name.full || fallback;
}

export const getPatientName = (id: string, patients: readonly Named[]) => nameById(id, patients, "Unknown Patient");
export const getDoctorName = (id: string, doctors: readonly Named[]) => nameById(id, doctors, "Unknown Doctor");
export const getStaffName = (id: string, staff: readonly Named[]) => nameById(id, staff, "Unknown Staff");

/** Up to two initials for an avatar: "Amali Dissanayake" → "AD". Empty when there's no name. */
export function getInitials(name?: string | null): string {
  if (!name) return "";
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Whole years from a date of birth to `on` (today by default), or null without a valid date.
 * "YYYY-MM-DD" is read as a calendar date, so a birthday counts from local midnight.
 */
export function calculateAge(dob: string | null | undefined, on: Date = new Date()): number | null {
  const [year, month, day] = (dob ?? "").slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const hadBirthday = on.getMonth() + 1 > month || (on.getMonth() + 1 === month && on.getDate() >= day);
  return on.getFullYear() - year - (hadBirthday ? 0 : 1);
}

/** A patient's age and sex for a list row: "35y · Female". Either part is left out when unknown. */
export function formatAgeSex(dob: string | null | undefined, sex?: string | null): string {
  const age = calculateAge(dob);
  return [age === null ? "" : `${age}y`, sex ? formatStatus(sex) : ""].filter(Boolean).join(" · ");
}

/** A day on the local calendar as YYYY-MM-DD (today by default), the form date inputs and `expiryDate` use. */
export function getTodayString(on: Date = new Date()): string {
  return `${on.getFullYear()}-${String(on.getMonth() + 1).padStart(2, "0")}-${String(on.getDate()).padStart(2, "0")}`;
}

/** "Good morning" until noon, "Good afternoon" until 5 pm, then "Good evening". */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
