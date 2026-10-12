import { queryOptions } from "@tanstack/react-query";
import { getUser, getUserSummary, getUsersByRole, getUsersNamed } from "@/lib/api/users";
import { getPaymentTotals } from "@/lib/api/payments";
import { getOrganizations } from "@/lib/api/organizations";
import { getSessions } from "@/lib/api/schedules";

export const userQueries = {
  all: ["users"] as const,
  summary: () => queryOptions({
    queryKey: [...userQueries.all, "summary"],
    queryFn: getUserSummary,
  }),
  byRole: (role: string) => queryOptions({
    queryKey: [...userQueries.all, "role", role],
    queryFn: () => getUsersByRole(role),
  }),
  detail: (userId: string) => queryOptions({
    queryKey: [...userQueries.all, userId],
    queryFn: () => getUser(userId),
  }),
  /** The accounts with these user or practitioner ids. */
  named: (ids: string[], practitionerIds: string[]) => queryOptions({
    queryKey: [...userQueries.all, "named", ids, practitionerIds],
    queryFn: () => getUsersNamed(ids, practitionerIds),
    enabled: ids.length + practitionerIds.length > 0,
  }),
};

export const paymentQueries = {
  all: ["payments"] as const,
  /** Income across every receptionist, or one's (by practitioner id). */
  totals: (collectedBy?: string) => queryOptions({
    queryKey: [...paymentQueries.all, "totals", collectedBy ?? null],
    queryFn: () => getPaymentTotals(collectedBy),
  }),
};

export const organizationQueries = {
  all: ["organizations"] as const,
  list: (includeInactive = false) => queryOptions({
    queryKey: [...organizationQueries.all, { includeInactive }],
    queryFn: () => getOrganizations({ includeInactive }),
  }),
};

export const scheduleQueries = {
  /** A doctor's weekly sessions. */
  forDoctor: (practitionerId: string) => queryOptions({
    queryKey: ["schedules", practitionerId],
    queryFn: () => getSessions(practitionerId),
  }),
};
