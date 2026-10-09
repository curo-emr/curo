import { queryOptions } from "@tanstack/react-query";
import { getUser, getUserSummary, getUsersByRole } from "@/lib/api/users";
import { getPaymentTotals } from "@/lib/api/payments";
import { getOrganizations } from "@/lib/api/organizations";

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
