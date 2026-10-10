import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums';
import type { AuthUser } from './jwt-auth.guard';
import { patientScope, readablePatient } from './patient-scope';

const OWN = 'patient-own';
const OTHER = 'patient-other';

const user = (role: UserRole, patientId: string | null = null): AuthUser => ({
  userId: 'u1',
  email: 'someone@curo.test',
  role,
  practitionerId: null,
  patientId,
  name: null,
  organizationId: null,
});

describe('patientScope', () => {
  it("is a patient's own record", () => {
    expect(patientScope(user(UserRole.PATIENT, OWN))).toBe(OWN);
  });

  it('is every patient for staff', () => {
    expect(patientScope(user(UserRole.DOCTOR))).toBeUndefined();
  });

  it('refuses a patient login linked to no record', () => {
    expect(() => patientScope(user(UserRole.PATIENT))).toThrow(
      ForbiddenException,
    );
  });
});

describe('readablePatient', () => {
  it('gives staff the patient they asked for, or none', () => {
    expect(readablePatient(user(UserRole.DOCTOR), OTHER)).toBe(OTHER);
    expect(readablePatient(user(UserRole.DOCTOR))).toBeUndefined();
  });

  it('limits a patient to their own record when they name none or their own', () => {
    expect(readablePatient(user(UserRole.PATIENT, OWN))).toBe(OWN);
    expect(readablePatient(user(UserRole.PATIENT, OWN), OWN)).toBe(OWN);
  });

  it("refuses a patient another patient's record", () => {
    expect(() => readablePatient(user(UserRole.PATIENT, OWN), OTHER)).toThrow(
      ForbiddenException,
    );
  });
});
