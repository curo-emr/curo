import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@curo/shared/enums';
import { AppointmentStatus, QueueStage } from '../enums';

// Legal moves through the day's patient flow. `null` = not yet in the flow.
// Doctors may jump in from any pre-doctor stage because the nurse step is optional.
const TRANSITIONS: Record<QueueStage | 'none', QueueStage[]> = {
  none: [QueueStage.WAITING_NURSE, QueueStage.READY_FOR_DOCTOR, QueueStage.WITH_DOCTOR],
  [QueueStage.WAITING_NURSE]: [QueueStage.WITH_NURSE, QueueStage.READY_FOR_DOCTOR, QueueStage.WITH_DOCTOR],
  [QueueStage.WITH_NURSE]: [QueueStage.READY_FOR_DOCTOR, QueueStage.WAITING_NURSE, QueueStage.WITH_DOCTOR],
  [QueueStage.READY_FOR_DOCTOR]: [QueueStage.WITH_DOCTOR, QueueStage.WITH_NURSE],
  [QueueStage.WITH_DOCTOR]: [QueueStage.DONE],
  [QueueStage.DONE]: [],
};

// Which roles may move a patient INTO a stage. SUPER_ADMIN may set any stage
// but is still bound by TRANSITIONS.
const STAGE_ROLES: Record<QueueStage, UserRole[]> = {
  [QueueStage.WAITING_NURSE]: [UserRole.RECEPTIONIST, UserRole.NURSE],
  [QueueStage.WITH_NURSE]: [UserRole.NURSE],
  [QueueStage.READY_FOR_DOCTOR]: [UserRole.RECEPTIONIST, UserRole.NURSE],
  [QueueStage.WITH_DOCTOR]: [UserRole.DOCTOR],
  [QueueStage.DONE]: [UserRole.DOCTOR],
};

/**
 * Validates a queue-stage change. Returns false when `next` equals `current`
 * (an idempotent no-op the caller should skip), true when the move is legal,
 * and throws otherwise.
 */
export function assertQueueTransition(current: string | null, next: QueueStage, role: string): boolean {
  if (role !== UserRole.SUPER_ADMIN && !STAGE_ROLES[next].includes(role as UserRole)) {
    throw new ForbiddenException(`Role ${role} cannot move a patient to '${next}'`);
  }
  if (current === next) return false;
  const allowed = TRANSITIONS[(current as QueueStage) ?? 'none'] ?? [];
  if (!allowed.includes(next)) {
    throw new BadRequestException(`Cannot move a patient from '${current ?? 'none'}' to '${next}'`);
  }
  return true;
}

/**
 * Queue stage implied by an appointment status change (system-driven, no role
 * check). `undefined` = leave the stage untouched.
 */
export function queueStageForStatus(status: AppointmentStatus, current: string | null): string | null | undefined {
  switch (status) {
    case AppointmentStatus.ARRIVED:
      return current ? undefined : QueueStage.WAITING_NURSE; // check-in feeds the nurse queue
    case AppointmentStatus.FULFILLED:
      return QueueStage.DONE;
    case AppointmentStatus.CANCELLED:
    case AppointmentStatus.NOSHOW:
      return null; // leaves the flow
    default:
      return undefined;
  }
}
