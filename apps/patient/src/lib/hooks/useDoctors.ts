import { useQuery } from "@tanstack/react-query";
import type { Doctor } from "@/lib/api/patient-portal";
import { directoryQueries } from "@/lib/queries";

const NONE: Doctor[] = [];

/** The doctors, to name them; empty until they load, so names read "Unknown Doctor" meanwhile. */
export const useDoctors = () => useQuery(directoryQueries.doctors()).data ?? NONE;
