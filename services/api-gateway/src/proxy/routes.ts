// Which backend serves each path, and which paths need no token. Kept apart
// from the proxy so it can be tested without loading http-proxy-middleware.

/** First path segment → the backend that serves it (URLs from env, with local defaults). */
export const SERVICE_ROUTES: Record<string, string> = {
  '/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/organizations': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/patients': process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  '/appointments':
    process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
  '/payments': process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
  '/encounters': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/notes': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/vitals': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/prescriptions': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/lab-orders': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/tasks': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/icd10': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/dispense': process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/stock': process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/medication-catalog':
    process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/orders': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/catalog': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/results': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/reports': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/instruments': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/qc-logs': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/lab-staff': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/documents': process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3009',
  '/notifications':
    process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
  '/audit': process.env.AUDIT_SERVICE_URL || 'http://localhost:3008',
};

// `/health` is answered before the proxy middleware runs (see main.ts).
const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'];

/** Each backend once, in route order. */
export const SERVICE_TARGETS = [...new Set(Object.values(SERVICE_ROUTES))];

/** The backend for `path`, matched on whole segments, or null when none serves it. */
export function targetFor(path: string): string | null {
  for (const [prefix, target] of Object.entries(SERVICE_ROUTES)) {
    if (
      path === prefix ||
      path.startsWith(prefix + '/') ||
      path.startsWith(prefix + '?')
    ) {
      return target;
    }
  }
  return null;
}

/** Whether `path` is let through without a token. */
export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path.startsWith(p));
}
