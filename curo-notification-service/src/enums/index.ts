export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  RECEPTIONIST = 'RECEPTIONIST',
  PHARMACIST = 'PHARMACIST',
  LAB_STAFF = 'LAB_STAFF',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum NotificationEventType {
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  PRESCRIPTION_READY = 'prescription_ready',
  LAB_RESULTS_READY = 'lab_results_ready',
  LOW_STOCK_ALERT = 'low_stock_alert',
  GENERAL = 'general',
}
