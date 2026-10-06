import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';

const SERVICE_MAP: Record<string, string> = {
  '/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/organizations': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/patients': process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  '/appointments': process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
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
  '/medication-catalog': process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/orders': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/catalog': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/results': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/reports': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/instruments': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/qc-logs': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/lab-staff': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/documents': process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3009',
  '/notifications': process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
  '/audit': process.env.AUDIT_SERVICE_URL || 'http://localhost:3008',
};

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/health'];

// Pre-create one proxy per unique target URL
const proxies = new Map<string, RequestHandler>();
for (const target of new Set(Object.values(SERVICE_MAP))) {
  proxies.set(target, createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err: Error, _req: Request, res: any) => {
        if (!res.headersSent) {
          res.status(502).json({ message: 'Service temporarily unavailable', error: err.message });
        }
      },
    },
  }) as RequestHandler);
}

function getTarget(path: string): string | null {
  for (const [prefix, target] of Object.entries(SERVICE_MAP)) {
    if (path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?')) {
      return target;
    }
  }
  return null;
}

// ─── Aggregated OpenAPI docs ────────────────────────────────────────────────
// Each downstream service exposes its own spec at `${base}/api-docs-json`. We
// fetch them all once (cached), merge paths + schemas into a single OpenAPI 3
// document with one server (the gateway) and a global bearer-auth scheme, and
// serve it at GET /openapi.json. GET /docs renders it with Scalar. Both routes
// are handled here in the middleware so they are never proxied and need no auth.
const SPEC_BASES = Array.from(new Set(Object.values(SERVICE_MAP)));
const GATEWAY_PUBLIC_URL = process.env.GATEWAY_PUBLIC_URL || 'http://localhost:3000';

let mergedSpecCache: any = null;
async function buildMergedSpec(): Promise<any> {
  if (mergedSpecCache) return mergedSpecCache;
  const merged: any = {
    openapi: '3.0.0',
    info: {
      title: 'Curo EMR API',
      description:
        'Unified API reference for the Curo EMR platform. All requests go through the ' +
        `gateway at ${GATEWAY_PUBLIC_URL}. Obtain a token via POST /auth/login, click ` +
        '**Authorize**, paste the accessToken, then call any endpoint.',
      version: '1.0.0',
    },
    servers: [{ url: GATEWAY_PUBLIC_URL, description: 'API gateway' }],
    tags: [] as any[],
    paths: {} as Record<string, any>,
    components: {
      schemas: {} as Record<string, any>,
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
    security: [{ bearerAuth: [] }],
  };
  const seenTags = new Set<string>();
  await Promise.all(
    SPEC_BASES.map(async (base) => {
      try {
        const { data } = await axios.get(`${base}/api-docs-json`, { timeout: 5000 });
        for (const [p, item] of Object.entries(data.paths || {})) {
          // First service to declare a path wins (clinical precedes pharmacy in
          // SERVICE_MAP, so the reachable /prescriptions handler is kept).
          if (!merged.paths[p]) merged.paths[p] = item;
        }
        Object.assign(merged.components.schemas, data.components?.schemas || {});
        for (const t of data.tags || []) {
          if (!seenTags.has(t.name)) { seenTags.add(t.name); merged.tags.push(t); }
        }
      } catch {
        // service unreachable / no spec — leave the merged doc partial
      }
    }),
  );
  mergedSpecCache = merged;
  return merged;
}

const SCALAR_HTML = `<!doctype html>
<html>
  <head>
    <title>Curo EMR API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    // Aggregated API documentation — served directly, never proxied, no auth.
    if (path === '/openapi.json') {
      if (req.query.refresh) mergedSpecCache = null;
      buildMergedSpec()
        .then((spec) => res.json(spec))
        .catch(() => res.status(502).json({ message: 'Failed to build aggregated spec' }));
      return;
    }
    if (path === '/docs' || path === '/docs/') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(SCALAR_HTML);
    }

    const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p));

    if (!isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'curo_jwt_secret_dev_2024_change_in_prod') as any;
        req.headers['x-user-id'] = payload.sub;
        req.headers['x-user-role'] = payload.role;
        req.headers['x-user-email'] = payload.email;
      } catch {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
    }

    const target = getTarget(path);
    if (!target) {
      return res.status(404).json({ message: `No service found for path ${path}` });
    }

    const proxy = proxies.get(target);
    if (!proxy) {
      return res.status(502).json({ message: 'Proxy not configured' });
    }

    proxy(req, res, next);
  }
}
