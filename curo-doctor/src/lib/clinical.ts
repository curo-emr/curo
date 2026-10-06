import type { Prescription, PrescriptionItem, Problem } from "@/types";

// Small, pure helpers for reading a patient's clinical record (shared by the chart and the visit).

/** Active problems, one per ICD code (the same diagnosis recorded at several visits shows once). */
export function uniqueActiveProblems(problems: Problem[]): Problem[] {
  const byCode = new Map<string, Problem>();
  for (const p of problems) {
    if (p.status !== "active") continue;
    const key = p.icdCode || p.name;
    const seen = byCode.get(key);
    if (!seen || p.onsetDate > seen.onsetDate) byCode.set(key, p);
  }
  return [...byCode.values()].sort((a, b) => b.onsetDate.localeCompare(a.onsetDate));
}

/** Medications prescribed within the last `days` days — newest first, one entry per drug name. */
export function recentPrescriptionItems(prescriptions: Prescription[], days = 90): { item: PrescriptionItem; date: string }[] {
  const since = Date.now() - days * 86_400_000;
  const seen = new Set<string>();
  return prescriptions
    .filter(rx => !rx.createdAt || new Date(rx.createdAt).getTime() >= since)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap(rx => rx.items.map(item => ({ item, date: rx.createdAt })))
    .filter(({ item }) => !seen.has(item.displayName) && !!seen.add(item.displayName));
}

export const recentMedicationNames = (prescriptions: Prescription[], days = 90) =>
  recentPrescriptionItems(prescriptions, days).map(({ item }) => item.displayName);

/** Diagnoses recorded at a given visit, primary first. */
export function encounterDiagnoses(problems: Problem[], encounterId: string): Problem[] {
  return problems
    .filter(p => p.encounterId === encounterId)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}
