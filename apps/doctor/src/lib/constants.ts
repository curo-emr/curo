// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  PATIENTS: "/patients",
  PATIENT: (id: string) => `/patients/${id}`,
  NEW_PATIENT: "/patients/new",
  EDIT_PATIENT: (id: string) => `/patients/${id}/edit`,
  NEW_ENCOUNTER: (patientId: string) => `/patients/${patientId}/encounters/new`,
  ENCOUNTER: (patientId: string, encounterId: string) => `/patients/${patientId}/encounters/${encounterId}`,
  SCHEDULE: "/schedule",
  ICD: "/icd",
  DIRECTORY: "/directory",
  SETTINGS: "/settings",
} as const;
