import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { assertQueueTransition, queueStageForStatus } from './queue-stage';
import { UserRole } from '@curo/shared/enums';
import { AppointmentStatus, QueueStage } from '../enums';

describe('assertQueueTransition', () => {
  it('lets a nurse pick up a waiting patient and send them to the doctor', () => {
    expect(
      assertQueueTransition(
        QueueStage.WAITING_NURSE,
        QueueStage.WITH_NURSE,
        UserRole.NURSE,
      ),
    ).toBe(true);
    expect(
      assertQueueTransition(
        QueueStage.WITH_NURSE,
        QueueStage.READY_FOR_DOCTOR,
        UserRole.NURSE,
      ),
    ).toBe(true);
  });

  it('lets reception bypass the nurse', () => {
    expect(
      assertQueueTransition(
        QueueStage.WAITING_NURSE,
        QueueStage.READY_FOR_DOCTOR,
        UserRole.RECEPTIONIST,
      ),
    ).toBe(true);
    expect(
      assertQueueTransition(
        null,
        QueueStage.READY_FOR_DOCTOR,
        UserRole.RECEPTIONIST,
      ),
    ).toBe(true);
  });

  it('lets the doctor start from any pre-doctor stage (nurse step optional)', () => {
    for (const from of [
      null,
      QueueStage.WAITING_NURSE,
      QueueStage.WITH_NURSE,
      QueueStage.READY_FOR_DOCTOR,
    ]) {
      expect(
        assertQueueTransition(from, QueueStage.WITH_DOCTOR, UserRole.DOCTOR),
      ).toBe(true);
    }
  });

  it('treats setting the current stage as a no-op', () => {
    expect(
      assertQueueTransition(
        QueueStage.WITH_DOCTOR,
        QueueStage.WITH_DOCTOR,
        UserRole.DOCTOR,
      ),
    ).toBe(false);
  });

  it('rejects illegal transitions with 400', () => {
    expect(() =>
      assertQueueTransition(
        QueueStage.READY_FOR_DOCTOR,
        QueueStage.DONE,
        UserRole.DOCTOR,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertQueueTransition(
        QueueStage.DONE,
        QueueStage.WITH_NURSE,
        UserRole.NURSE,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      assertQueueTransition(
        QueueStage.WITH_DOCTOR,
        QueueStage.WITH_NURSE,
        UserRole.SUPER_ADMIN,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects roles that may not set a stage with 403', () => {
    expect(() =>
      assertQueueTransition(
        QueueStage.WAITING_NURSE,
        QueueStage.WITH_DOCTOR,
        UserRole.NURSE,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertQueueTransition(
        QueueStage.WAITING_NURSE,
        QueueStage.WITH_NURSE,
        UserRole.RECEPTIONIST,
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      assertQueueTransition(
        QueueStage.WAITING_NURSE,
        QueueStage.WITH_NURSE,
        UserRole.PATIENT,
      ),
    ).toThrow(ForbiddenException);
  });

  it('lets SUPER_ADMIN set any stage along legal transitions', () => {
    expect(
      assertQueueTransition(
        QueueStage.WITH_DOCTOR,
        QueueStage.DONE,
        UserRole.SUPER_ADMIN,
      ),
    ).toBe(true);
  });
});

describe('queueStageForStatus', () => {
  it('queues a checked-in patient for the nurse only if not already in the flow', () => {
    expect(queueStageForStatus(AppointmentStatus.ARRIVED, null)).toBe(
      QueueStage.WAITING_NURSE,
    );
    expect(
      queueStageForStatus(
        AppointmentStatus.ARRIVED,
        QueueStage.READY_FOR_DOCTOR,
      ),
    ).toBeUndefined();
  });

  it('finishes the flow on fulfilled and clears it on cancel/no-show', () => {
    expect(
      queueStageForStatus(AppointmentStatus.FULFILLED, QueueStage.WITH_DOCTOR),
    ).toBe(QueueStage.DONE);
    expect(
      queueStageForStatus(
        AppointmentStatus.CANCELLED,
        QueueStage.WAITING_NURSE,
      ),
    ).toBeNull();
    expect(queueStageForStatus(AppointmentStatus.NOSHOW, null)).toBeNull();
  });

  it('leaves the stage alone for other statuses', () => {
    expect(queueStageForStatus(AppointmentStatus.BOOKED, null)).toBeUndefined();
  });
});
