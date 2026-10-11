import { apiClient } from '@curo/web/api';

/** A patient's sign-in to the patient portal, or null when they have none. */
export interface PortalAccess {
  login: { email: string; isActive: boolean } | null;
}

const portalAccessPath = (patientId: string) => `/auth/patients/${patientId}/portal-access`;

export async function getPortalAccess(patientId: string): Promise<PortalAccess> {
  return (await apiClient.get<PortalAccess>(portalAccessPath(patientId))).data;
}

/** Creates the patient's login: they sign in with the email on their record. */
export async function givePortalAccess(patientId: string, password: string) {
  await apiClient.post(portalAccessPath(patientId), { password });
}

export async function resetPortalPassword(patientId: string, password: string) {
  await apiClient.post(`${portalAccessPath(patientId)}/reset-password`, { password });
}
