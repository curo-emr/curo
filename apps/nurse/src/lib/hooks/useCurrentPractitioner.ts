import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@curo/web/auth";
import type { Practitioner } from "@/lib/api/practitioners";
import { practitionerQueries } from "@/lib/queries";

// The signed-in nurse's practitioner record (name, qualification) — null until loaded.
export function useCurrentPractitioner(): Practitioner | null {
  const { user } = useAuth();
  const staff = useQuery({ ...practitionerQueries.byRole(user?.role ?? ""), enabled: !!user?.practitionerId });
  return staff.data?.find(p => p.id === user?.practitionerId) ?? null;
}
