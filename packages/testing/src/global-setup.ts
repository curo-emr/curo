import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { databaseOptions } from '@curo/shared/database';
import { TEST_DB_NAME, assertTestDatabase } from './test-database';

const REPO_ROOT = join(__dirname, '../../..');

/** Recreates the test database, then applies the migrations the way deploys do. */
export default async function globalSetup(): Promise<void> {
  assertTestDatabase(TEST_DB_NAME);

  // The database can't be dropped over its own connection, so use the server's default one.
  const server = new DataSource({
    ...databaseOptions([]),
    database: 'postgres',
  } as DataSourceOptions);
  await server.initialize();
  try {
    await server.query(
      `DROP DATABASE IF EXISTS "${TEST_DB_NAME}" WITH (FORCE)`,
    );
    await server.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  } finally {
    await server.destroy();
  }

  execSync('npm run --silent db:migrate', {
    cwd: REPO_ROOT,
    env: { ...process.env, DB_NAME: TEST_DB_NAME },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
