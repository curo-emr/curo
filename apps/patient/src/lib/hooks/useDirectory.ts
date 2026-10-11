import { useQuery } from "@tanstack/react-query";
import { nameById } from "@curo/web/format";
import { directoryQueries } from "@/lib/queries";
import type { Named } from "@/types";

const NONE: Named[] = [];

/** Names doctors; "Your doctor" until the list loads. */
export function useDoctorName() {
  const doctors = useQuery(directoryQueries.doctors()).data ?? NONE;
  return (id: string) => nameById(id, doctors, "Your doctor");
}

/** The pharmacy with `id`, once the list loads. */
export function usePharmacy(id: string): Named | undefined {
  return useQuery(directoryQueries.pharmacies()).data?.find(p => p.id === id);
}
