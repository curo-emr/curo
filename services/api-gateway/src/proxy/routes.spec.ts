import { SERVICE_TARGETS, isPublicPath, targetFor } from './routes';

// No *_SERVICE_URL is set under Jest, so each backend is at its local default.
const AUTH = 'http://localhost:3001';
const PATIENT = 'http://localhost:3002';
const APPOINTMENT = 'http://localhost:3003';
const CLINICAL = 'http://localhost:3004';
const PHARMACY = 'http://localhost:3005';
const LAB = 'http://localhost:3006';
const NOTIFICATION = 'http://localhost:3007';
const AUDIT = 'http://localhost:3008';
const DOCUMENT = 'http://localhost:3009';

describe('targetFor', () => {
  it.each([
    ['/auth/login', AUTH],
    ['/organizations', AUTH],
    ['/patients/123/allergies', PATIENT],
    ['/appointments/123/queue-stage', APPOINTMENT],
    ['/payments', APPOINTMENT],
    ['/encounters/visit', CLINICAL],
    ['/prescriptions/pending', CLINICAL],
    ['/lab-orders/123', CLINICAL],
    ['/icd10', CLINICAL],
    ['/dispense', PHARMACY],
    ['/stock/grouped', PHARMACY],
    ['/medication-catalog', PHARMACY],
    ['/orders/scan', LAB],
    ['/results', LAB],
    ['/reports/123', LAB],
    ['/notifications/count', NOTIFICATION],
    ['/audit', AUDIT],
    ['/documents/123/content', DOCUMENT],
  ])('sends %s to %s', (path, target) => {
    expect(targetFor(path)).toBe(target);
  });

  it('matches whole path segments, not prefixes of a segment', () => {
    // /lab-orders is the clinical service's; /orders is the lab's.
    expect(targetFor('/lab-orders')).toBe(CLINICAL);
    expect(targetFor('/orders')).toBe(LAB);
    expect(targetFor('/ordersx')).toBeNull();
    expect(targetFor('/patientsearch')).toBeNull();
  });

  it('serves nothing for unknown paths', () => {
    expect(targetFor('/')).toBeNull();
    expect(targetFor('/admin')).toBeNull();
  });
});

describe('SERVICE_TARGETS', () => {
  it('lists each of the nine backends once', () => {
    expect([...SERVICE_TARGETS].sort()).toEqual(
      [
        AUTH,
        PATIENT,
        APPOINTMENT,
        CLINICAL,
        PHARMACY,
        LAB,
        NOTIFICATION,
        AUDIT,
        DOCUMENT,
      ].sort(),
    );
  });
});

describe('isPublicPath', () => {
  it('lets sign-in and token refresh through without a token', () => {
    expect(isPublicPath('/auth/login')).toBe(true);
    expect(isPublicPath('/auth/refresh')).toBe(true);
  });

  it('needs a token for everything else in the auth service', () => {
    for (const path of [
      '/auth/profile',
      '/auth/staff',
      '/auth/users',
      '/auth/practitioners',
    ])
      expect(isPublicPath(path)).toBe(false);
  });

  it('needs a token for every other service', () => {
    for (const path of ['/patients', '/encounters/visit', '/documents/1'])
      expect(isPublicPath(path)).toBe(false);
  });
});
