// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  PRESCRIPTIONS: "/prescriptions",
  PRESCRIPTION: (id: string) => `/prescriptions/${id}`,
  PATIENTS: "/patients",
  PATIENT: (id: string) => `/patients/${id}`,
  INVENTORY: "/inventory",
  DISPENSING_LOG: "/dispensing-log",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;
