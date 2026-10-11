import type { Tone } from "@curo/web/ui/status-badge";

// Route paths (super-admin portal)
export const ROUTES = {
  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD: "/dashboard",
  USERS: "/users",
  USER: (id: string) => `/users/${id}`,
  NEW_USER: "/users/new",
  ORGANIZATIONS: "/organizations",
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
  "NURSE",
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
  NURSE: "Nursing Officer",
  PATIENT: "Patient",
  SUPER_ADMIN: "Super Admin",
};

// Each role's badge colour in the users list.
export const ROLE_TONE: Record<UserRole, Tone> = {
  DOCTOR: "info",
  RECEPTIONIST: "teal",
  PHARMACIST: "purple",
  LAB_STAFF: "warning",
  NURSE: "success",
  PATIENT: "neutral",
  SUPER_ADMIN: "error",
};

export const GENDERS = ["male", "female", "other", "unknown"] as const;

// Organizations: clinics, hospitals, pharmacies and laboratories.
export const ORGANIZATION_TYPES = ["clinic", "hospital", "pharmacy", "laboratory"] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  clinic: "Clinic",
  hospital: "Hospital",
  pharmacy: "Pharmacy",
  laboratory: "Laboratory",
};

// The kinds of organization each staff role works at (the auth service's
// workplace.ts enforces the same). Roles not listed belong to none.
export const WORKPLACE_TYPES: Partial<Record<UserRole, readonly OrganizationType[]>> = {
  DOCTOR: ["clinic", "hospital"],
  NURSE: ["clinic", "hospital"],
  RECEPTIONIST: ["clinic", "hospital"],
  PHARMACIST: ["pharmacy"],
  LAB_STAFF: ["laboratory"],
};

// Roles that hold a professional qualification and licence.
export const PROFESSIONAL_ROLES: readonly UserRole[] = ["DOCTOR", "NURSE", "PHARMACIST", "LAB_STAFF"];

// Roles that can't work until assigned: pharmacists dispense from their pharmacy's
// stock, and lab staff work only on the tests sent to their lab.
export const WORKPLACE_REQUIRED: readonly UserRole[] = ["PHARMACIST", "LAB_STAFF"];
