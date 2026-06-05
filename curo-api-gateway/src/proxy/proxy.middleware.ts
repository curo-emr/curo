import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';

const SERVICE_MAP: Record<string, string> = {
  '/auth': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  '/patients': process.env.PATIENT_SERVICE_URL || 'http://localhost:3002',
  '/appointments': process.env.APPOINTMENT_SERVICE_URL || 'http://localhost:3003',
  '/encounters': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/notes': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/vitals': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/prescriptions': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/lab-orders': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/tasks': process.env.CLINICAL_SERVICE_URL || 'http://localhost:3004',
  '/dispense': process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/stock': process.env.PHARMACY_SERVICE_URL || 'http://localhost:3005',
  '/orders': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/results': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/reports': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
  '/instruments': process.env.LAB_SERVICE_URL || 'http://localhost:3006',
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

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
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
