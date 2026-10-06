// The hardcoded patient ID for this demo dashboard
export const CURRENT_PATIENT_ID = "pat_1001";

// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  APPOINTMENTS: "/appointments",
  VISITS: "/visits",
  VISIT: (id: string) => `/visits/${id}`,
  PRESCRIPTIONS: "/prescriptions",
  PRESCRIPTION: (id: string) => `/prescriptions/${id}`,
  LAB_REPORTS: "/lab-reports",
  HEALTH_RECORDS: "/health-records",
  PROFILE: "/profile",
  SETTINGS: "/settings",
} as const;

// Appointment statuses
export const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  NOT_ARRIVED: "not_arrived",
  ARRIVED: "arrived",
  WAITING: "waiting",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

// Encounter statuses
export const ENCOUNTER_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

// Lab order statuses
export const LAB_ORDER_STATUS = {
  DRAFT: "draft",
  SENT_TO_LAB: "sent_to_lab",
  RESULTS_PENDING: "results_pending",
  COMPLETED: "completed",
} as const;

// Prescription statuses
export const PRESCRIPTION_STATUS = {
  DRAFT: "draft",
  SENT_TO_PHARMACY: "sent_to_pharmacy",
} as const;

// Priority levels
export const PRIORITY = {
  ROUTINE: "routine",
  URGENT: "urgent",
  STAT: "stat",
} as const;

// Severity levels
export const SEVERITY = {
  MILD: "mild",
  MODERATE: "moderate",
  SEVERE: "severe",
} as const;

// Problem statuses
export const PROBLEM_STATUS = {
  ACTIVE: "active",
  RESOLVED: "resolved",
  INACTIVE: "inactive",
} as const;
