// Route paths (super-admin portal)
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  USERS: "/users",
  USER: (id: string) => `/users/${id}`,
  NEW_USER: "/users/new",
  INCOME: "/income",
  AUDIT: "/audit",
  SETTINGS: "/settings",
} as const;

// All assignable roles
export const USER_ROLES = [
  "DOCTOR",
  "RECEPTIONIST",
  "PHARMACIST",
  "LAB_STAFF",
  "PATIENT",
  "SUPER_ADMIN",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

// Human-readable role labels
export const ROLE_LABELS: Record<string, string> = {
  DOCTOR: "Doctor",
  RECEPTIONIST: "Receptionist",
  PHARMACIST: "Pharmacist",
  LAB_STAFF: "Lab Staff",
  PATIENT: "Patient",
  SUPER_ADMIN: "Super Admin",
};

export const GENDERS = ["male", "female", "other", "unknown"] as const;
