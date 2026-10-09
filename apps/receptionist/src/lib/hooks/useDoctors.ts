import { useQuery } from "@tanstack/react-query";
import { doctorQueries } from "@/lib/queries";
import type { Doctor } from "@/types";

const NONE: Doctor[] = [];

/** The doctors, to name and filter by; empty until they load, so names read "Unknown Doctor" meanwhile. */
export const useDoctors = () => useQuery(doctorQueries.all()).data ?? NONE;
