import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus } from '../enums';

// Legal status changes. A visit is completed only once the patient has arrived,
// and a completed, cancelled or missed appointment stays closed (book a new one).
// The portals' status menus mirror this (nextAppointmentStatuses in
// @curo/web/appointments); keep the two in step.
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.PROPOSED]: [
    AppointmentStatus.PENDING,
    AppointmentStatus.WAITLIST,
    AppointmentStatus.BOOKED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.PENDING]: [
    AppointmentStatus.WAITLIST,
    AppointmentStatus.BOOKED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.WAITLIST]: [
    AppointmentStatus.BOOKED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.BOOKED]: [
    AppointmentStatus.ARRIVED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NOSHOW,
  ],
  [AppointmentStatus.ARRIVED]: [
    AppointmentStatus.FULFILLED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.FULFILLED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.NOSHOW]: [],
};

/**
 * Validates a status change. Returns false when `next` equals `current` (an
 * idempotent no-op the caller should skip), true when the change is legal, and
 * throws otherwise.
 */
export function assertStatusTransition(
  current: AppointmentStatus,
  next: AppointmentStatus,
): boolean {
  if (current === next) return false;
  if (!TRANSITIONS[current].includes(next)) {
    throw new BadRequestException(
      `Cannot change an appointment from '${current}' to '${next}'`,
    );
  }
  return true;
}
