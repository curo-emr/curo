// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  TRIAGE_QUEUE: "/triage",
  TRIAGE: (appointmentId: string) => `/triage/${appointmentId}`,
  SETTINGS: "/settings",
} as const;
