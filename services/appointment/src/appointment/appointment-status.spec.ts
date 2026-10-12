import { BadRequestException } from '@nestjs/common';
import { assertStatusTransition } from './appointment-status';
import { AppointmentStatus } from '../enums';

const { BOOKED, ARRIVED, FULFILLED, CANCELLED, NOSHOW, WAITLIST } =
  AppointmentStatus;

describe('assertStatusTransition', () => {
  it('takes a booking through check-in to a completed visit', () => {
    expect(assertStatusTransition(BOOKED, ARRIVED)).toBe(true);
    expect(assertStatusTransition(ARRIVED, FULFILLED)).toBe(true);
  });

  it('lets a booking be cancelled or missed, and a checked-in patient leave', () => {
    expect(assertStatusTransition(BOOKED, CANCELLED)).toBe(true);
    expect(assertStatusTransition(BOOKED, NOSHOW)).toBe(true);
    expect(assertStatusTransition(ARRIVED, CANCELLED)).toBe(true);
    expect(assertStatusTransition(WAITLIST, BOOKED)).toBe(true);
  });

  it('treats setting the current status as a no-op', () => {
    for (const status of Object.values(AppointmentStatus)) {
      expect(assertStatusTransition(status, status)).toBe(false);
    }
  });

  it("refuses to complete a visit the patient hasn't arrived for", () => {
    expect(() => assertStatusTransition(BOOKED, FULFILLED)).toThrow(
      BadRequestException,
    );
  });

  it('refuses to reopen a completed, cancelled or missed appointment', () => {
    for (const closed of [FULFILLED, CANCELLED, NOSHOW]) {
      for (const next of [BOOKED, ARRIVED, FULFILLED, CANCELLED, NOSHOW]) {
        if (next !== closed) {
          expect(() => assertStatusTransition(closed, next)).toThrow(
            BadRequestException,
          );
        }
      }
    }
  });

  it('refuses to send a checked-in patient back to booked', () => {
    expect(() => assertStatusTransition(ARRIVED, BOOKED)).toThrow(
      BadRequestException,
    );
  });
});
