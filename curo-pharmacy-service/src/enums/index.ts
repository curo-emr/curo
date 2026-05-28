export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum MedicationRequestStatus {
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  ENTERED_IN_ERROR = 'entered-in-error',
  STOPPED = 'stopped',
  DRAFT = 'draft',
}

export enum MedicationDispenseStatus {
  PREPARATION = 'preparation',
  IN_PROGRESS = 'in-progress',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on-hold',
  COMPLETED = 'completed',
  ENTERED_IN_ERROR = 'entered-in-error',
  STOPPED = 'stopped',
  DECLINED = 'declined',
  UNKNOWN = 'unknown',
}
