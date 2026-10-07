import { randomUUID } from 'node:crypto';
import type { INestApplication, Type } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import type { JwtPayload } from '@curo/shared/auth';
import { configureApp } from '@curo/shared/bootstrap';
import { UserRole } from '@curo/shared/enums';
import { assertTestDatabase } from './test-database';

/** A user the tests act as: their token claims, and the headers that carry the token. */
export interface TestActor extends JwtPayload {
  headers: { Authorization: string };
}

/** One backend running in-process on the test database. */
export interface ServiceUnderTest {
  /** Supertest client for the service's HTTP API. */
  api: ReturnType<typeof request>;
  /** The service's own connection, to insert fixtures and check what was written. */
  db: DataSource;
  /**
   * A signed-in user of `role`. Ids are fresh for every call: staff get a
   * practitionerId and patients a patientId, as tokens from the auth service do.
   */
  as(role: UserRole, claims?: Partial<JwtPayload>): TestActor;
  close(): Promise<void>;
}

/** A provider to swap for a test double, e.g. object storage for an in-memory store. */
export interface ProviderOverride {
  provide: string | symbol | Type<unknown>;
  useValue: unknown;
}

/** Boots a service's AppModule with production's request handling, on the test database. */
export async function startService(
  appModule: Type<unknown>,
  overrides: ProviderOverride[] = [],
): Promise<ServiceUnderTest> {
  const builder = Test.createTestingModule({ imports: [appModule] });
  for (const { provide, useValue } of overrides)
    builder.overrideProvider(provide).useValue(useValue);
  const moduleRef = await builder.compile();
  const db = moduleRef.get(DataSource);
  assertTestDatabase(db.options.database);

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  // Listening (rather than only init) lets supertest send concurrent requests.
  await app.listen(0, '127.0.0.1');

  const jwt = app.get(JwtService);
  return {
    api: request(app.getHttpServer()),
    db,
    as(role, claims = {}) {
      const payload: JwtPayload = {
        sub: randomUUID(),
        email: `${role.toLowerCase()}.${randomUUID()}@curo.test`,
        role,
        practitionerId: hasPractitioner(role) ? randomUUID() : null,
        patientId: role === UserRole.PATIENT ? randomUUID() : null,
        name: `Test ${role}`,
        ...claims,
      };
      const token = jwt.sign(payload);
      return { ...payload, headers: { Authorization: `Bearer ${token}` } };
    },
    close: () => app.close(),
  };
}

function hasPractitioner(role: UserRole): boolean {
  return role !== UserRole.PATIENT && role !== UserRole.SUPER_ADMIN;
}
