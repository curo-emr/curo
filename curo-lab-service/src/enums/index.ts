export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum ServiceRequestStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on-hold',
  REVOKED = 'revoked',
  COMPLETED = 'completed',
  ENTERED_IN_ERROR = 'entered-in-error',
  UNKNOWN = 'unknown',
}

export enum DiagnosticReportStatus {
  REGISTERED = 'registered',
  PARTIAL = 'partial',
  PRELIMINARY = 'preliminary',
  FINAL = 'final',
  AMENDED = 'amended',
  CORRECTED = 'corrected',
  APPENDED = 'appended',
  CANCELLED = 'cancelled',
  ENTERED_IN_ERROR = 'entered-in-error',
  UNKNOWN = 'unknown',
}

export enum ObservationStatus {
  REGISTERED = 'registered',
  PRELIMINARY = 'preliminary',
  FINAL = 'final',
  AMENDED = 'amended',
  CORRECTED = 'corrected',
  CANCELLED = 'cancelled',
  ENTERED_IN_ERROR = 'entered-in-error',
  UNKNOWN = 'unknown',
}

export enum InstrumentStatus {
  OPERATIONAL = 'operational',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
}
