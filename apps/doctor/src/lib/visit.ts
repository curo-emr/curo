import type { Appointment } from "@/types";
import type { Tone } from "@curo/web/ui/status-badge";
import { ROUTES } from "@/lib/constants";
import { getTodayString } from "@/lib/utils";
import { getAppointments } from "@/lib/api/appointments";

// Single source of truth for "what can the doctor do with this appointment?" —
// shared by the Today queue, the schedule and the patient chart.

const CLOSED_STATUSES: Appointment["status"][] = ["completed", "cancelled", "no_show"];

export const isClosed = (a: Appointment) => CLOSED_STATUSES.includes(a.status) || a.queueStage === "done";
/** Closed without a visit: cancelled, or the patient never came. Not someone the doctor saw. */
export const isMissed = (a: Appointment) => a.status === "cancelled" || a.status === "no_show";
export const isInConsultation = (a: Appointment) =>
  !isClosed(a) && (a.queueStage === "with_doctor" || a.status === "in_progress");

export function visitHref(patientId: string, appointmentId?: string) {
  const base = ROUTES.NEW_ENCOUNTER(patientId);
  return appointmentId ? `${base}?appointmentId=${appointmentId}` : base;
}

// ─── Queue grouping ──────────────────────────────────────────────────────────

export type QueueGroup = "consultation" | "ready" | "triage" | "upcoming" | "done";

// In the order the doctor works through them; tones match the stage badges.
export const QUEUE_GROUPS: { id: QueueGroup; label: string; tone: Tone }[] = [
  { id: "consultation", label: "In consultation", tone: "info" },
  { id: "ready", label: "Ready to see", tone: "success" },
  { id: "triage", label: "With nurse", tone: "warning" },
  { id: "upcoming", label: "Not arrived yet", tone: "neutral" },
  { id: "done", label: "Finished", tone: "purple" },
];

export function getQueueGroup(a: Appointment): QueueGroup {
  if (isClosed(a)) return "done";
  if (isInConsultation(a)) return "consultation";
  if (a.queueStage === "ready_for_doctor") return "ready";
  if (a.queueStage === "waiting_nurse" || a.queueStage === "with_nurse") return "triage";
  // Checked in by reception but not routed through the nurse queue: the doctor can see them.
  if (a.status === "arrived" || a.status === "waiting") return "ready";
  return "upcoming";
}

// ─── Primary action ──────────────────────────────────────────────────────────

export interface VisitAction {
  kind: "start" | "resume";
  label: string;
  href: string;
}

export function getVisitAction(a: Appointment, hasDraft = false): VisitAction | null {
  // Nothing to start until the patient is closed out or has actually arrived.
  if (isClosed(a) || (getQueueGroup(a) === "upcoming" && !hasDraft)) return null;
  const href = visitHref(a.patientId, a.id);
  if (isInConsultation(a) || hasDraft) return { kind: "resume", label: "Resume visit", href };
  return { kind: "start", label: "Start visit", href };
}

// The appointment a visit for this patient belongs to today, if any — so a visit
// started from the chart still closes the appointment and advances the queue.
export async function findTodaysAppointment(patientId: string): Promise<Appointment | null> {
  const today = getTodayString();
  const appts = await getAppointments({ date: today, patientId }).catch(() => [] as Appointment[]);
  const open = appts.filter(a => a.date === today && !isClosed(a));
  const rank: Record<QueueGroup, number> = { consultation: 0, ready: 1, triage: 2, upcoming: 3, done: 4 };
  return open.sort((a, b) => rank[getQueueGroup(a)] - rank[getQueueGroup(b)] || a.time.localeCompare(b.time))[0] ?? null;
}

// ─── Drafts (browser autosave) ───────────────────────────────────────────────

const DRAFT_PREFIX = "curo_visit_draft:";

export const visitDraftKey = (userId: string, patientId: string, appointmentId?: string) =>
  `${DRAFT_PREFIX}${userId}:${appointmentId ?? `patient-${patientId}`}`;

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked — autosave is best effort.
  }
}

export function removeDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export function hasDraft(key: string) {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

// Drafts hold patient data — never leave them behind on a shared clinic machine.
export function clearAllDrafts() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(DRAFT_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}
