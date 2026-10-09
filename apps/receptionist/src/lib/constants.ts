// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  PATIENTS: "/patients",
  PATIENT: (id: string) => `/patients/${id}`,
  PATIENT_EDIT: (id: string) => `/patients/${id}/edit`,
  NEW_PATIENT: "/patients/new",
  APPOINTMENTS: "/appointments",
  NEW_APPOINTMENT: "/appointments/new",
  QUEUE: "/queue",
  SCHEDULE: "/schedule",
  INCOME: "/income",
  REPORTS: "/reports",
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

// Visit statuses
export const VISIT_STATUS = {
  CHECKED_IN: "checked_in",
  WITH_DOCTOR: "with_doctor",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
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
