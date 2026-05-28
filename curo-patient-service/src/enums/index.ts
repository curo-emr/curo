export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
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
