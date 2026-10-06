export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  NURSE = 'NURSE',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum AppointmentStatus {
  PROPOSED = 'proposed',
  PENDING = 'pending',
  BOOKED = 'booked',
  ARRIVED = 'arrived',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  NOSHOW = 'noshow',
  WAITLIST = 'waitlist',
}

export enum EncounterStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in-progress',
  ON_HOLD = 'onhold',
  DISCHARGED = 'discharged',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ENTERED_IN_ERROR = 'entered-in-error',
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

export enum ConditionClinicalStatus {
  ACTIVE = 'active',
  RECURRENCE = 'recurrence',
  RELAPSE = 'relapse',
  INACTIVE = 'inactive',
  REMISSION = 'remission',
  RESOLVED = 'resolved',
}

export enum AllergyIntoleranceType {
  ALLERGY = 'allergy',
  INTOLERANCE = 'intolerance',
}

export enum AllergyIntoleranceCriticality {
  LOW = 'low',
  HIGH = 'high',
  UNABLE_TO_ASSESS = 'unable-to-assess',
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

export enum NotificationEventType {
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  PRESCRIPTION_READY = 'prescription_ready',
  LAB_RESULTS_READY = 'lab_results_ready',
  LOW_STOCK_ALERT = 'low_stock_alert',
  GENERAL = 'general',
}

export enum TaskStatus {
  DRAFT = 'draft',
  REQUESTED = 'requested',
  RECEIVED = 'received',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

export enum InstrumentStatus {
  OPERATIONAL = 'operational',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

export enum MaritalStatus {
  SINGLE = 'S',
  MARRIED = 'M',
  DIVORCED = 'D',
  WIDOWED = 'W',
  SEPARATED = 'L',
  UNKNOWN = 'UNK',
}
