import type { INestApplication } from '@nestjs/common';

/**
 * Serves `GET /health` → `{ "status": "ok" }` for container health checks.
 * Call before `listen()`: the route sits ahead of every Nest middleware, guard
 * and route, so it needs no token and is never proxied by the gateway.
 */
export function registerHealthCheck(app: INestApplication): void {
  const http = app.getHttpAdapter();
  http.get('/health', (_req, res) => {
    http.reply(res, { status: 'ok' }, 200);
  });
}
