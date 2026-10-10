// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  WORKLIST: "/worklist",
  /** The worklist narrowed to one visit's tests, as a scanned visit slip finds them. */
  VISIT_WORKLIST: (encounterId: string) => `/worklist?visit=${encounterId}`,
  ORDER: (id: string) => `/worklist/${id}`,
  ORDER_RESULTS: (id: string) => `/worklist/${id}/results`,
  PATIENTS: "/patients",
  PATIENT: (id: string) => `/patients/${id}`,
  TEST_CATALOG: "/test-catalog",
  REPORTS: "/reports",
  QC: "/qc",
  SETTINGS: "/settings",
} as const;
