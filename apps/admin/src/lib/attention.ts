import type { DoctorSession } from "@curo/web/schedule";
import type { AdminUser } from "@/types";

export interface AttentionItem {
  user: AdminUser;
  /** Why they can't work yet, e.g. "No pharmacy yet, so they can't dispense". */
  reason: string;
}

// What a missing workplace stops, for the roles that can't work without one (WORKPLACE_REQUIRED).
const NO_WORKPLACE: Record<string, string> = {
  PHARMACIST: "No pharmacy yet, so they can't dispense",
  LAB_STAFF: "No laboratory yet, so they can't see any tests",
};

/**
 * Active staff who can't do their job until an admin sets something up: a pharmacist or
 * lab staff member with no workplace, or a doctor with no weekly sessions to book into.
 * `sessionsOf` is undefined for a doctor whose sessions haven't loaded, who is left out.
 */
export function needsAttention(
  staff: AdminUser[],
  sessionsOf: (practitionerId: string) => DoctorSession[] | undefined,
): AttentionItem[] {
  return staff.flatMap(user => {
    if (!user.isActive) return [];
    if (NO_WORKPLACE[user.role] && !user.organizationId) return [{ user, reason: NO_WORKPLACE[user.role] }];
    if (user.role === "DOCTOR" && user.practitionerId && sessionsOf(user.practitionerId)?.length === 0)
      return [{ user, reason: "No weekly sessions, so reception can't book them" }];
    return [];
  });
}
