import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Socket } from 'net';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { jwtSecret } from '@curo/shared/auth';
import { SERVICE_TARGETS, isPublicPath, targetFor } from './routes';

// Pre-create one proxy per unique target URL
const proxies = new Map<string, RequestHandler<Request, Response>>();
for (const target of SERVICE_TARGETS) {
  proxies.set(
    target,
    createProxyMiddleware<Request, Response>({
      target,
      changeOrigin: true,
      on: {
        // The services read the client's IP from X-Forwarded-For (login rate
        // limiting, for one). Replace any value the client sent with the address
        // that actually connected, so a client can't pose as another IP.
        proxyReq: (proxyReq, req) => {
          if (req.socket.remoteAddress)
            proxyReq.setHeader('x-forwarded-for', req.socket.remoteAddress);
        },
        error: (err, _req, res) => {
          // A failed WebSocket upgrade hands over the raw socket.
          if (res instanceof Socket) return void res.destroy();
          if (!res.headersSent) {
            res.status(502).json({
              message: 'Service temporarily unavailable',
              error: err.message,
            });
          }
        },
      },
    }),
  );
}

// ─── Aggregated OpenAPI docs ────────────────────────────────────────────────
// Each downstream service exposes its own spec at `${base}/api-docs-json`. We
// fetch them all once (cached), merge paths + schemas into a single OpenAPI 3
// document with one server (the gateway) and a global bearer-auth scheme, and
// serve it at GET /openapi.json. GET /docs renders it with Scalar. Both routes
// are handled here in the middleware so they are never proxied and need no auth.
const GATEWAY_PUBLIC_URL =
  process.env.GATEWAY_PUBLIC_URL || 'http://localhost:3000';

/** The parts of a service's OpenAPI document that get merged. */
interface ServiceSpec {
  paths?: Record<string, unknown>;
  components?: { schemas?: Record<string, unknown> };
  tags?: { name: string }[];
}

async function fetchSpec(base: string): Promise<ServiceSpec> {
  try {
    const { data } = await axios.get<ServiceSpec>(`${base}/api-docs-json`, {
      timeout: 5000,
    });
    return data;
  } catch {
    return {}; // service unreachable / no spec — leave the merged doc partial
  }
}

let mergedSpecCache: object | null = null;
async function buildMergedSpec(): Promise<object> {
  if (mergedSpecCache) return mergedSpecCache;
  const paths: Record<string, unknown> = {};
  const schemas: Record<string, unknown> = {};
  const tags: { name: string }[] = [];
  const seenTags = new Set<string>();
  // Fetched in parallel, merged in route order.
  for (const spec of await Promise.all(SERVICE_TARGETS.map(fetchSpec))) {
    for (const [p, item] of Object.entries(spec.paths ?? {})) {
      // First service to declare a path wins.
      paths[p] ??= item;
    }
    Object.assign(schemas, spec.components?.schemas);
    for (const t of spec.tags ?? []) {
      if (!seenTags.has(t.name)) {
        seenTags.add(t.name);
        tags.push(t);
      }
    }
  }
  mergedSpecCache = {
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
    tags,
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  };
  return mergedSpecCache;
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
        .catch(() =>
          res.status(502).json({ message: 'Failed to build aggregated spec' }),
        );
      return;
    }
    if (path === '/docs' || path === '/docs/') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(SCALAR_HTML);
    }

    if (!isPublicPath(path)) {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res
          .status(401)
          .json({ message: 'Unauthorized: No token provided' });
      }
      // Rejects bad tokens at the edge. The request is forwarded unchanged:
      // each service verifies the token again and reads the user from it.
      try {
        jwt.verify(authHeader.split(' ')[1], jwtSecret());
      } catch {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
    }

    const target = targetFor(path);
    if (!target) {
      return res
        .status(404)
        .json({ message: `No service found for path ${path}` });
    }

    const proxy = proxies.get(target);
    if (!proxy) {
      return res.status(502).json({ message: 'Proxy not configured' });
    }

    // Proxy errors are answered by the `on.error` handler above.
    void proxy(req, res, next);
  }
}
