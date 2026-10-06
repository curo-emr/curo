// Route paths
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  WORKLIST: "/worklist",
  ORDER: (id: string) => `/worklist/${id}`,
  ORDER_RESULTS: (id: string) => `/worklist/${id}/results`,
  PATIENTS: "/patients",
  PATIENT: (id: string) => `/patients/${id}`,
  TEST_CATALOG: "/test-catalog",
  REPORTS: "/reports",
  QC: "/qc",
  SETTINGS: "/settings",
} as const;

// Lab order statuses
export const LAB_ORDER_STATUS = {
  RECEIVED: "received",
  COLLECTED: "collected",
  PROCESSING: "processing",
  RESULTED: "resulted",
  VERIFIED: "verified",
  DISPATCHED: "dispatched",
  REJECTED: "rejected",
} as const;

// Priority levels
export const PRIORITY = {
  ROUTINE: "routine",
  URGENT: "urgent",
  STAT: "stat",
} as const;

// Result flags
export const RESULT_FLAG = {
  NORMAL: "normal",
  LOW: "low",
  HIGH: "high",
  CRITICAL: "critical",
  ABNORMAL: "abnormal",
} as const;

// Specimen types
export const SPECIMEN_TYPE = {
  WHOLE_BLOOD: "whole_blood",
  SERUM: "serum",
  URINE: "urine",
  CSF: "csf",
  SWAB: "swab",
  OTHER: "other",
} as const;

// Specimen conditions
export const SPECIMEN_CONDITION = {
  ACCEPTABLE: "acceptable",
  HEMOLYZED: "hemolyzed",
  LIPEMIC: "lipemic",
  CLOTTED: "clotted",
  INSUFFICIENT: "insufficient",
  WRONG_CONTAINER: "wrong_container",
} as const;

// Departments
export const DEPARTMENT = {
  HEMATOLOGY: "Hematology",
  BIOCHEMISTRY: "Biochemistry",
  MICROBIOLOGY: "Microbiology",
  PATHOLOGY: "Pathology",
} as const;

// Instrument statuses
export const INSTRUMENT_STATUS = {
  OPERATIONAL: "operational",
  MAINTENANCE: "maintenance",
  OFFLINE: "offline",
} as const;

// QC statuses
export const QC_STATUS = {
  PASS: "pass",
  FAIL: "fail",
  WARNING: "warning",
} as const;
