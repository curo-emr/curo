/** A snake_case code as sentence-case text, the way the portals show statuses: `not_arrived` → "Not arrived". */
export function formatStatus(code: string): string {
  const words = code.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Named = { id: string; name: { full: string } };

/** The full name of whoever in `people` has `id`, or `fallback` when no one does. */
export function nameById(id: string, people: readonly Named[], fallback: string): string {
  return people.find(p => p.id === id)?.name.full || fallback;
}

export const getPatientName = (id: string, patients: readonly Named[]) => nameById(id, patients, "Unknown Patient");
export const getDoctorName = (id: string, doctors: readonly Named[]) => nameById(id, doctors, "Unknown Doctor");
export const getStaffName = (id: string, staff: readonly Named[]) => nameById(id, staff, "Unknown Staff");
