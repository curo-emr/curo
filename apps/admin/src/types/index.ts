import type { OrganizationType } from "@/lib/constants";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  licenseNumber?: string | null;
  active: boolean;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  practitionerId: string | null;
  patientId: string | null;
  name: string;
  specialization?: string | null;
  phone?: string | null;
  organizationId?: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userRole?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId?: string;
  changes?: Record<string, unknown>;
  outcome?: string;
  outcomeDescription?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  patientId: string;
  appointmentId?: string;
  collectedBy?: string;
  type?: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  receiptNumber?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}
