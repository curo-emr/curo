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

// What an appointment is for, stored in appointments.serviceType. The portals
// show these as labels (VISIT_TYPES in @curo/web/appointments); keep the two in step.
export enum VisitType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  PROCEDURE = 'procedure',
  EMERGENCY = 'emergency',
}

// Where a checked-in patient is in the day's flow (appointments.queueStage).
// Both nurse stages are optional: reception can bypass straight to the doctor.
export enum QueueStage {
  WAITING_NURSE = 'waiting_nurse',
  WITH_NURSE = 'with_nurse',
  READY_FOR_DOCTOR = 'ready_for_doctor',
  WITH_DOCTOR = 'with_doctor',
  DONE = 'done',
}

// What became of a recorded payment. Only `paid` counts as income; an
// administrator's correction may mark it refunded or waived.
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  WAIVED = 'waived',
}
