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
