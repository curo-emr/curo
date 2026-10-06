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

// Prescription statuses
export const PRESCRIPTION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DISPENSED: "dispensed",
  PARTIALLY_DISPENSED: "partially_dispensed",
  ON_HOLD: "on_hold",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

// Priority levels
export const PRIORITY = {
  ROUTINE: "routine",
  URGENT: "urgent",
  STAT: "stat",
} as const;

// Medication categories
export const MEDICATION_CATEGORY = {
  ANALGESIC: "analgesic",
  ANTIBIOTIC: "antibiotic",
  ANTIHYPERTENSIVE: "antihypertensive",
  ANTIDIABETIC: "antidiabetic",
  ANTIHISTAMINE: "antihistamine",
  VITAMIN: "vitamin",
  CARDIOVASCULAR: "cardiovascular",
  GASTROINTESTINAL: "gastrointestinal",
  RESPIRATORY: "respiratory",
  OTHER: "other",
} as const;

// Drug forms
export const DRUG_FORM = {
  TABLET: "tablet",
  CAPSULE: "capsule",
  SYRUP: "syrup",
  INJECTION: "injection",
  CREAM: "cream",
  OINTMENT: "ointment",
  DROPS: "drops",
  INHALER: "inhaler",
  SUPPOSITORY: "suppository",
  PATCH: "patch",
} as const;

// Stock transaction types
export const STOCK_TRANSACTION_TYPE = {
  PURCHASE: "purchase",
  DISPENSED: "dispensed",
  RETURN: "return",
  ADJUSTMENT: "adjustment",
  EXPIRED: "expired",
  DAMAGED: "damaged",
} as const;

// Pharmacy staff roles
export const PHARMACY_STAFF_ROLE = {
  CHIEF_PHARMACIST: "chief_pharmacist",
  PHARMACIST: "pharmacist",
  PHARMACY_TECHNICIAN: "pharmacy_technician",
} as const;
