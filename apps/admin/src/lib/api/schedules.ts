import { apiClient } from "@curo/web/api";
import type { DoctorSession } from "@curo/web/schedule";

/** A session as the editor sends it; the doctor is in the URL. */
export type SessionInput = Omit<DoctorSession, "practitionerId" | "room"> & { room?: string };

export async function getSessions(practitionerId: string): Promise<DoctorSession[]> {
  return (await apiClient.get<DoctorSession[]>("/schedules", { params: { practitionerId } })).data;
}

/** Replaces the doctor's whole week; the API refuses overlapping sessions. */
export async function setSessions(practitionerId: string, sessions: SessionInput[]): Promise<DoctorSession[]> {
  return (await apiClient.put<DoctorSession[]>(`/schedules/${practitionerId}`, { sessions })).data;
}
