import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { registerHealthCheck } from '@curo/shared/health';
import { AppModule } from './app.module';

// ESM-only, so Jest can't load it; these requests never reach a proxy anyway.
jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: () => jest.fn(),
}));

describe('API gateway edge', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>({
      bodyParser: false,
    });
    registerHealthCheck(app);
    await app.init();
  });

  afterAll(() => app.close());

  it('answers /health without a token', () =>
    request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' }));

  it('rejects a proxied path without a token', () =>
    request(app.getHttpServer()).get('/patients').expect(401));

  it('rejects a proxied path with an invalid token', () =>
    request(app.getHttpServer())
      .get('/patients')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401));
});
